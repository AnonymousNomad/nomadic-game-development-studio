import copy
import hashlib
import json
import os
from pathlib import Path
import struct
import subprocess
import sys
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from scene_forge import (SCHEMA,build,load_spec,validate_spec,make_scene,build_glb,inspect_glb,canonical,sha)

class ForgeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.spec=load_spec(ROOT/'examples'/'aframe.json')

    def test_01_schema_valid(self):
        x=validate_spec(self.spec)
        self.assertEqual(x['width_m'],9.0)
        self.assertEqual(x['depth_m'],11.0)

    def test_02_reject_traversal(self):
        s=copy.deepcopy(self.spec);s['name']='../../escape'
        with self.assertRaisesRegex(ValueError,'NAME'):
            validate_spec(s)

    def test_03_reject_unknown_key(self):
        s=copy.deepcopy(self.spec);s['commands']='rm -rf /'
        with self.assertRaisesRegex(ValueError,'UNKNOWN_FIELD'):
            validate_spec(s)

    def test_04_reject_nan(self):
        s=copy.deepcopy(self.spec);s['cabin']['width_m']=float('nan')
        with self.assertRaisesRegex(ValueError,'SPEC_DIMENSION_INVALID'):
            validate_spec(s)

    def test_05_reject_bool_dimension(self):
        s=copy.deepcopy(self.spec);s['cabin']['width_m']=True
        with self.assertRaisesRegex(ValueError,'SPEC_DIMENSION_INVALID'):
            validate_spec(s)

    def test_06_roof_height_constraint(self):
        s=copy.deepcopy(self.spec);s['cabin']['ridge_height_m']=4
        s['cabin']['wall_height_m']=3.5
        with self.assertRaisesRegex(ValueError,'SPEC_ROOF_GEOMETRY_INVALID'):
            validate_spec(s)

    def test_07_deterministic_glb(self):
        scene=make_scene(self.spec)
        p={'test':True}
        a=build_glb(scene,p)
        b=build_glb(make_scene(self.spec),p)
        self.assertEqual(a,b)
        self.assertTrue(a.startswith(b'glTF'))
        stat=inspect_glb(a)
        self.assertGreater(stat['objects'],50)
        self.assertGreater(stat['triangles'],300)
        self.assertIn('front_deck',stat['part_names'])
        self.assertIn('door_threshold',stat['part_names'])
        self.assertEqual(len(stat['part_names']),len(set(stat['part_names'])))

    def test_08_fail_closed_on_existing_output(self):
        with tempfile.TemporaryDirectory() as td:
            first=build(self.spec,ROOT/'examples',td)
            old=Path(first['glb']).read_bytes()
            with self.assertRaisesRegex(FileExistsError,'ALREADY_EXISTS'):
                build(self.spec,ROOT/'examples',td)
            self.assertEqual(Path(first['glb']).read_bytes(),old)
            self.assertEqual(json.loads(Path(first['manifest']).read_text())['production_qualified'],False)

    def test_09_reference_sha_and_confinement(self):
        with tempfile.TemporaryDirectory() as td, tempfile.TemporaryDirectory() as out:
            root=Path(td)
            (root/'art.png').write_bytes(b'example-asset-not-an-image-inference')
            s=copy.deepcopy(self.spec);s['reference_image']='art.png'
            built=build(s,root,out,root)
            manifest=json.loads(Path(built['manifest']).read_text())
            self.assertEqual(manifest['reference']['sha256'],hashlib.sha256((root/'art.png').read_bytes()).hexdigest())
            self.assertEqual(manifest['reference']['role'],'art_direction_evidence_only_not_reconstructed')
        with tempfile.TemporaryDirectory() as td, tempfile.TemporaryDirectory() as out:
            s=copy.deepcopy(self.spec);s['reference_image']='../outside.png'
            (Path(td).parent/'outside.png').write_bytes(b'outside')
            try:
                with self.assertRaisesRegex(ValueError,'REFERENCE_OUTSIDE_ROOT'):
                    build(s,td,out,td)
            finally:
                (Path(td).parent/'outside.png').unlink(missing_ok=True)

    def test_10_glb_bad_length_rejected(self):
        blob=bytearray(build_glb(make_scene(self.spec),{}))
        blob[8:12]=struct.pack('<I',999)
        with self.assertRaisesRegex(ValueError,'HEADER'):
            inspect_glb(bytes(blob))

    def test_11_glb_external_parser(self):
        try:import trimesh
        except ImportError:self.skipTest('independent trimesh unavailable')
        blob=build_glb(make_scene(self.spec),{})
        import io
        x=trimesh.load(io.BytesIO(blob),file_type='glb',force='scene')
        self.assertGreater(len(x.geometry),50)
        self.assertGreater(sum(len(mesh.faces) for mesh in x.geometry.values()),300)

class MCPTests(unittest.TestCase):
    def invoke(self,requests,extra_env=None):
        e=os.environ.copy()
        e.pop('NSF_ALLOW_WRITES',None)
        e.pop('NSF_OUTPUT_ROOT',None)
        e.pop('NSF_REFERENCE_ROOT',None)
        e.update(extra_env or {})
        p=subprocess.run([sys.executable,str(ROOT/'mcp_server.py')],
              input='\n'.join(json.dumps(x) for x in requests)+'\n',text=True,
              capture_output=True,timeout=12,env=e)
        self.assertEqual(p.returncode,0,p.stderr)
        return [json.loads(x) for x in p.stdout.splitlines()]

    def test_12_mcp_initialize_and_list(self):
        a=self.invoke([{'jsonrpc':'2.0','id':1,'method':'initialize','params':{'protocolVersion':'2024-11-05'}},
                       {'jsonrpc':'2.0','method':'notifications/initialized'},
                       {'jsonrpc':'2.0','id':2,'method':'tools/list'}])
        self.assertEqual(len(a),2)
        self.assertEqual(a[0]['result']['serverInfo']['name'],'nomadic-scene-forge')
        self.assertEqual(len(a[1]['result']['tools']),5)

    def test_13_mcp_plan_has_no_writes(self):
        a=self.invoke([{'jsonrpc':'2.0','id':1,'method':'tools/call','params':{
              'name':'nsf_plan_aframe','arguments':{'spec':ForgeTests.spec}}}])
        self.assertEqual(json.loads(a[0]['result']['content'][0]['text'])['status'],'VALIDATED_NOT_BUILT')
        self.assertFalse(a[0]['result']['isError'])

    def test_14_mcp_write_denied_default(self):
        a=self.invoke([{'jsonrpc':'2.0','id':1,'method':'tools/call','params':{
              'name':'nsf_build_aframe','arguments':{'spec':ForgeTests.spec}}}])
        self.assertTrue(a[0]['result']['isError'])
        self.assertIn('WRITES_NOT_AUTHORIZED',a[0]['result']['content'][0]['text'])

    def test_15_mcp_write_and_inspect_scoped(self):
        with tempfile.TemporaryDirectory() as out, tempfile.TemporaryDirectory() as ref:
            e={'NSF_ALLOW_WRITES':'1','NSF_OUTPUT_ROOT':out,'NSF_REFERENCE_ROOT':ref}
            a=self.invoke([{'jsonrpc':'2.0','id':1,'method':'tools/call','params':{
                'name':'nsf_build_aframe','arguments':{'spec':ForgeTests.spec}}},
                {'jsonrpc':'2.0','id':2,'method':'tools/call','params':{
                'name':'nsf_inspect_glb','arguments':{'name':'alaska_aframe_v0'}}}],e)
            self.assertFalse(a[0]['result']['isError'],a)
            self.assertFalse(a[1]['result']['isError'],a)
            self.assertGreater(json.loads(a[1]['result']['content'][0]['text'])['objects'],50)
            self.assertEqual(len(list(Path(out).iterdir())),2)

    def test_16_blender_execution_denied_without_worker_gate(self):
        a=self.invoke([{'jsonrpc':'2.0','id':2,'method':'tools/call','params':{
            'name':'nsf_blender_stage_blend','arguments':{'name':'alaska_aframe_v0'}}}])
        self.assertTrue(a[0]['result']['isError'])
        self.assertIn('BLENDER_EXECUTION_NOT_AUTHORIZED',a[0]['result']['content'][0]['text'])

    def test_17_mcp_inspect_traversal_denied(self):
        with tempfile.TemporaryDirectory() as out:
            a=self.invoke([{'jsonrpc':'2.0','id':2,'method':'tools/call','params':{
                'name':'nsf_inspect_glb','arguments':{'name':'../../secrets'}}}],{'NSF_OUTPUT_ROOT':out})
            self.assertTrue(a[0]['result']['isError'])


class TerrainTests(unittest.TestCase):
    @staticmethod
    def png(width,height):
        import zlib
        def chunk(k,d):
            return struct.pack('>I',len(d))+k+d+struct.pack('>I',zlib.crc32(k+d)&0xffffffff)
        pixels=b''.join(b'\x00'+bytes((x+y)%256 for x in range(width)) for y in range(height))
        return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',width,height,8,0,0,0,0))+chunk(b'IDAT',zlib.compress(pixels))+chunk(b'IEND',b'')

    def test_18_terrain_true_image_elevation_mesh(self):
        from terrain_forge import build_terrain
        with tempfile.TemporaryDirectory() as input_root, tempfile.TemporaryDirectory() as out:
            (Path(input_root)/'heights.png').write_bytes(self.png(12,12))
            result=build_terrain('synthetic_valley','heights.png',input_root,out,samples=7)
            self.assertEqual(result['triangles'],72)
            self.assertEqual(json.loads(Path(result['manifest']).read_text())['production_qualified'],False)
            self.assertEqual(len(list(Path(out).iterdir())),2)

    def test_19_reject_fake_png_and_truncated(self):
        from terrain_forge import read_png_height
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/'bad.png';p.write_bytes(b'NOT_PNG')
            with self.assertRaisesRegex(ValueError,'PNG_INVALID_SIGNATURE'):
                read_png_height(p)
            p.write_bytes(self.png(8,8)[:-12])
            with self.assertRaisesRegex(ValueError,'PNG_INCOMPLETE'):
                read_png_height(p)

    def test_20_terrain_path_escape_fail(self):
        from terrain_forge import build_terrain
        with tempfile.TemporaryDirectory() as input_root, tempfile.TemporaryDirectory() as out:
            with self.assertRaises((FileNotFoundError,ValueError)):
                build_terrain('valley','../../bad.png',input_root,out)

    def test_21_heightmap_mcp_denied_default(self):
        a=MCPTests().invoke([{'jsonrpc':'2.0','id':2,'method':'tools/call','params':{
            'name':'nsf_build_terrain','arguments':{'name':'valley','image':'data.png'}}}])
        self.assertTrue(a[0]['result']['isError'])
        self.assertIn('WRITES_NOT_AUTHORIZED',a[0]['result']['content'][0]['text'])

if __name__=='__main__':unittest.main()

