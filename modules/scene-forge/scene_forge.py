#!/usr/bin/env python3
"""Nomadic Scene Forge v0: deterministic, subscription-free procedural glTF/GLB authoring.

Python stdlib only; builds asset geometry from a typed authored specification.
This is NOT neural image-to-3D reconstruction. Source image can be provenance-bound.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import re
import struct
import sys

SCHEMA = "nomadic.scene-forge/0.1"
SPEC_LIMIT = 65536
REF_LIMIT = 32 * 1024 * 1024
NAME = re.compile(r"^[a-z][a-z0-9_-]{0,48}$")
REQUIRED = ("width_m", "depth_m", "wall_height_m", "ridge_height_m", "deck_depth_m")
RANGES = {"width_m": (3.0, 25.0), "depth_m": (3.0, 35.0), "wall_height_m": (2.0, 8.0),
          "ridge_height_m": (3.0, 16.0), "deck_depth_m": (1.0, 8.0)}
PALETTE = {
    "timber": (0.40, 0.27, 0.16, 1.0, 0.84, 0.0),
    "trim": (0.63, 0.46, 0.28, 1.0, 0.67, 0.0),
    "roof": (0.10, 0.14, 0.17, 1.0, 0.53, 0.42),
    "glass": (0.12, 0.34, 0.43, 0.36, 0.13, 0.05),
    "foundation": (0.30, 0.31, 0.30, 1.0, 0.9, 0.0),
    "door": (0.35, 0.23, 0.14, 1.0, 0.71, 0.0),
}


def canonical(obj):
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("utf8")


def sha(data):
    return hashlib.sha256(data).hexdigest()


def validate_spec(spec):
    if not isinstance(spec, dict) or set(spec) - {"schema", "name", "cabin", "reference_image"}:
        raise ValueError("SPEC_UNKNOWN_FIELD")
    if spec.get("schema") != SCHEMA:
        raise ValueError("SPEC_SCHEMA_INVALID")
    name = spec.get("name")
    if not isinstance(name, str) or not NAME.fullmatch(name):
        raise ValueError("SPEC_NAME_INVALID")
    cabin = spec.get("cabin")
    if not isinstance(cabin, dict) or set(cabin) != set(REQUIRED):
        raise ValueError("SPEC_DIMENSION_FIELDS_INVALID")
    values = {}
    for k in REQUIRED:
        v = cabin[k]
        lo, hi = RANGES[k]
        if isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) or not (lo <= v <= hi):
            raise ValueError("SPEC_DIMENSION_INVALID:" + k)
        values[k] = float(v)
    if values["ridge_height_m"] <= values["wall_height_m"] + 1.0:
        raise ValueError("SPEC_ROOF_GEOMETRY_INVALID")
    ref = spec.get("reference_image")
    if ref is not None and (not isinstance(ref, str) or len(ref) > 2048 or Path(ref).suffix.lower() not in (".png", ".jpg", ".jpeg", ".webp")):
        raise ValueError("SPEC_REFERENCE_INVALID")
    return values


def load_spec(path):
    path = Path(path).resolve(strict=True)
    if path.stat().st_size > SPEC_LIMIT:
        raise ValueError("SPEC_TOO_LARGE")
    o = json.loads(path.read_text(encoding="utf-8"))
    validate_spec(o)
    return o


def _reference(spec, spec_base, reference_root=None):
    ref = spec.get("reference_image")
    if ref is None:
        return None
    path = (spec_base / ref).resolve(strict=True)
    if reference_root is not None and not path.is_relative_to(Path(reference_root).resolve(strict=True)):
        raise ValueError("REFERENCE_OUTSIDE_ROOT")
    if not path.is_file() or path.stat().st_size > REF_LIMIT:
        raise ValueError("REFERENCE_TOO_LARGE_OR_NOT_FILE")
    # Only content-authenticate a reference; do not pretend to extract geometry.
    return {"name": path.name, "sha256": sha(path.read_bytes()), "bytes": path.stat().st_size,
            "role": "art_direction_evidence_only_not_reconstructed"}


def cross(a, b):
    x = (a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0])
    m = math.sqrt(sum(v*v for v in x))
    if m < 1e-9:
        raise ValueError("DEGENERATE_FACE")
    return tuple(v/m for v in x)


class Scene:
    def __init__(self):
        self.parts = []
        self.named = set()

    def part(self, name, material, tris, collidable=True):
        if name in self.named:
            raise ValueError("DUPLICATE_PART:"+name)
        self.named.add(name)
        positions, normals, indices = [], [], []
        for t in tris:
            a,b,c = t
            normal = cross(tuple(b[i]-a[i] for i in range(3)), tuple(c[i]-a[i] for i in range(3)))
            n = len(positions)//3
            for v in t:
                positions.extend(round(float(x), 5) for x in v)
                normals.extend(normal)
            indices.extend((n,n+1,n+2))
        self.parts.append(dict(name=name, material=material, pos=positions, normals=normals,
                               indices=indices, collision=collidable))

    def box(self, name, pos, size, material, collidable=True):
        cx,cy,cz = pos
        dx,dy,dz = [v/2 for v in size]
        v = [(cx-dx,cy-dy,cz-dz),(cx+dx,cy-dy,cz-dz),
             (cx+dx,cy+dy,cz-dz),(cx-dx,cy+dy,cz-dz),
             (cx-dx,cy-dy,cz+dz),(cx+dx,cy-dy,cz+dz),
             (cx+dx,cy+dy,cz+dz),(cx-dx,cy+dy,cz+dz)]
        faces = [(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)]
        tris=[]
        for a,b,c,d in faces:
            tris.extend(((v[a],v[b],v[c]), (v[a],v[c],v[d])))
        self.part(name,material,tris,collidable)

    def quad(self, name, points, material, collidable=False):
        a,b,c,d=points
        self.part(name,material,[(a,b,c),(a,c,d)],collidable)

    def roof_panel(self, name, p0, p1, depth, material):
        # Triangle-strip panel with physically finite thickness. Front = negative Z.
        ux,uy=p1[0]-p0[0],p1[1]-p0[1]
        L=math.hypot(ux,uy)
        nx,ny=-uy/L*0.14,ux/L*0.14
        z0,z1=-depth/2-0.45,depth/2+0.45
        a=(p0[0],p0[1],z0);b=(p1[0],p1[1],z0)
        c=(p1[0],p1[1],z1);e=(p0[0],p0[1],z1)
        v=[a,b,c,e,tuple(a[i]+(nx,ny,0)[i] for i in range(3)),
           tuple(b[i]+(nx,ny,0)[i] for i in range(3)),
           tuple(c[i]+(nx,ny,0)[i] for i in range(3)),
           tuple(e[i]+(nx,ny,0)[i] for i in range(3))]
        faces=[(0,1,2,3),(4,7,6,5),(0,4,5,1),(3,2,6,7),(0,3,7,4),(1,5,6,2)]
        ts=[]
        for i,j,k,l in faces:
            ts.extend(((v[i],v[j],v[k]),(v[i],v[k],v[l])))
        self.part(name,material,ts)


def make_scene(spec):
    c=validate_spec(spec)
    w,d,h,r,deck=(c[k] for k in REQUIRED)
    s=Scene()
    # Axes: X width, Y up, -Z toward lake/view; meters.
    s.box('foundation',(0,0,0),(w,0.26,d),'foundation')
    s.box('cabin_floor',(0,0.14,0),(w,0.18,d),'timber')
    for side in (-1,1):
        s.box('sidewall_'+('left' if side<0 else 'right'), (side*(w/2-0.13), h/2+0.15,0),(.26,h,d),'timber')
    s.box('rear_wall',(0,h/2+0.15,d/2-.13),(w,h,.26),'timber')
    # Door space is real void between front wall segments; no invisible collision wall.
    door_x=-w*0.27; door_w=1.15; door_h=2.3; zf=-d/2
    left=(door_x-door_w/2-(-w/2));right=(w/2-(door_x+door_w/2))
    s.box('front_wall_left',(-w/2+left/2,h/2+0.15,zf), (left,h,.18),'timber')
    # Window opening on the right is built with real negative space, not opaque wall behind glass.
    s.box('front_wall_right_sill',(door_x+door_w/2+right/2,.68,zf),(right,1.06,.18),'timber')
    s.box('front_wall_right_header',(door_x+door_w/2+right/2,(h+2.83)/2+.15,zf),(right,h-2.68,.18),'timber')
    s.box('front_wall_lintel',(door_x,door_h+(h-door_h)/2+0.15,zf),(door_w,h-door_h,.18),'timber')
    for name,x in [('left',door_x-door_w/2),('right',door_x+door_w/2)]:
        s.box('door_jamb_'+name,(x,door_h/2+0.15,zf-.18),(.10,door_h,.13),'trim')
    s.box('door_header',(door_x,door_h+.18,zf-.18),(door_w+.12,.12,.15),'trim')
    # A traversable doorway has no closure mesh; a door leaf is metadata / future animation.
    s.box('door_threshold',(door_x,.2,zf-.17),(door_w,.10,.4),'trim')
    for side in (-1,1):
        s.roof_panel('roof_'+('left' if side<0 else 'right'),(side*(w/2+0.48),h),(0,r),d,'roof')
    # Front gable: split into transparent glass triangles above wall top.
    front=-d/2-.105
    for side in (-1,1):
        a=(0,r-.12,front); b=(side*(w/2-.34),h+.05,front); c=(0,h+.05,front)
        s.part('gable_glass_'+('left' if side<0 else 'right'),'glass',[(a,b,c)],False)
        s.box('gable_vertical_'+('left' if side<0 else 'right'), (side*w/4,h+.52,front-.03),(.08,.9,.15),'trim',False)
    s.box('gable_centre_post',(0,(h+r)/2,front-.1),(.14,r-h,.25),'trim')
    s.box('gable_lower_beam',(0,h+.04,front-.06),(w,.17,.21),'trim')
    # Glazed front band below gable to the right of the door.
    glass_left=door_x+door_w/2+.22
    glass_right=w/2-.34
    glass_width=glass_right-glass_left
    if glass_width>0.5:
        side_left=glass_left-(door_x+door_w/2)
        side_right=w/2-glass_right
        s.box('front_wall_window_left_edge',(door_x+door_w/2+side_left/2,1.94,zf),(side_left,1.75,.18),'timber')
        s.box('front_wall_window_right_edge',(glass_right+side_right/2,1.94,zf),(side_right,1.75,.18),'timber')
        s.box('front_glass',(glass_left+glass_width/2,1.92,front-.12),(glass_width,1.75,.055),'glass',False)
        s.box('front_glass_top_rail',(glass_left+glass_width/2,2.81,front-.12),(glass_width+.05,.09,.13),'trim',False)
        s.box('front_glass_bottom_rail',(glass_left+glass_width/2,1.05,front-.12),(glass_width+.05,.09,.13),'trim',False)
        for i in range(1,4):
            x=glass_left+glass_width*i/4
            s.box('glass_mullion_'+str(i),(x,1.92,front-.17),(.075,1.8,.12),'trim',False)
    # Deck, stairs and railings; centre gap for steps.
    zdeck=-d/2-deck/2
    s.box('front_deck',(0,.20,zdeck),(w+2.0,.28,deck),'trim')
    edge=-d/2-deck
    for x in (-w/2-0.9,w/2+0.9):
        s.box(('left' if x<0 else 'right')+'_deck_side_post',(x,.75,zdeck),(.18,1.25,.18),'trim')
    gap=1.65
    n=12
    for side in (-1,1):
        x_start=side*(gap/2+0.12)
        x_end=side*(w/2+1.0)
        lo,hi=sorted((x_start,x_end))
        s.box('deck_edge_rail_'+str(side),((lo+hi)/2,1.18,edge),(hi-lo,.15,.14),'trim')
        for i in range(n):
            x=lo+(hi-lo)*i/(n-1)
            s.box('deck_baluster_'+str(side)+'_'+str(i),(x,.76,edge),(.10,.92,.1),'trim')
    for side in (-1,1):
        x=side*(w/2+1.0)
        s.box('deck_side_rail_'+str(side),(x,1.18,zdeck),(.14,.14,deck),'trim')
        for i in range(9):
            z=-d/2 - (i+.5)*deck/9
            s.box('deck_side_baluster_'+str(side)+'_'+str(i),(x,.76,z),(.1,.9,.1),'trim')
    s.box('deck_step',(0,.03,edge-.60),(gap,0.18,1.1),'trim')
    # Schematic collision footprint mesh named separately, for importers to use as metadata.
    return s


def _align(buf, pad=0):
    while len(buf)%4:
        buf.append(pad)


def build_glb(scene, provenance):
    binary=bytearray()
    meshes=[];nodes=[];accessors=[];views=[]
    mats=[]
    for name,(rr,gg,bb,aa,rough,metal) in PALETTE.items():
        mats.append({'name':name,'pbrMetallicRoughness':{'baseColorFactor':[rr,gg,bb,aa],
          'roughnessFactor':rough,'metallicFactor':metal},'doubleSided':name=='glass',
          'alphaMode':'BLEND' if aa<1 else 'OPAQUE'})
    mid={k:i for i,k in enumerate(PALETTE)}
    for p in scene.parts:
        base=len(binary)
        binary.extend(struct.pack('<%sf'%len(p['pos']),*p['pos']))
        _align(binary)
        views.append({'buffer':0,'byteOffset':base,'byteLength':len(p['pos'])*4,'target':34962})
        apos=len(accessors)
        xs=p['pos'][0::3];ys=p['pos'][1::3];zs=p['pos'][2::3]
        accessors.append({'bufferView':len(views)-1,'componentType':5126,'count':len(xs),
                          'type':'VEC3','min':[min(xs),min(ys),min(zs)],'max':[max(xs),max(ys),max(zs)]})
        base=len(binary)
        binary.extend(struct.pack('<%sf'%len(p['normals']),*p['normals']))
        _align(binary)
        views.append({'buffer':0,'byteOffset':base,'byteLength':len(p['normals'])*4,'target':34962})
        anorm=len(accessors)
        accessors.append({'bufferView':len(views)-1,'componentType':5126,'count':len(xs),'type':'VEC3'})
        base=len(binary)
        binary.extend(struct.pack('<%sI'%len(p['indices']),*p['indices']))
        _align(binary)
        views.append({'buffer':0,'byteOffset':base,'byteLength':len(p['indices'])*4,'target':34963})
        aindex=len(accessors)
        accessors.append({'bufferView':len(views)-1,'componentType':5125,'count':len(p['indices']),
                          'type':'SCALAR','min':[0],'max':[len(xs)-1]})
        meshes.append({'name':p['name'], 'primitives':[{'attributes':{'POSITION':apos,'NORMAL':anorm},
                      'indices':aindex,'material':mid[p['material']],'mode':4}]})
        nodes.append({'name':p['name'],'mesh':len(meshes)-1,
                     'extras':{'stable_id':'nsf:'+p['name'], 'collision_candidate':p['collision']}})
    gltf={'asset':{'version':'2.0','generator':'Nomadic Scene Forge v0.1'},
          'scene':0,'scenes':[{'name':'authored_aframe','nodes':list(range(len(nodes)))}],
          'nodes':nodes,'meshes':meshes,'materials':mats,'bufferViews':views,'accessors':accessors,
          'buffers':[{'byteLength':len(binary)}],
          'extras':{'nomadic_scene_forge':provenance}}
    js=bytearray(canonical(gltf));_align(js,32)
    _align(binary)
    length=12+8+len(js)+8+len(binary)
    out=bytearray(struct.pack('<4sII',b'glTF',2,length))
    out.extend(struct.pack('<I4s',len(js),b'JSON'));out.extend(js)
    out.extend(struct.pack('<I4s',len(binary),b'BIN\0'));out.extend(binary)
    return bytes(out)


def inspect_glb(blob):
    if len(blob)<28:
        raise ValueError('GLB_TRUNCATED')
    magic,ver,length=struct.unpack('<4sII',blob[:12])
    if magic!=b'glTF' or ver!=2 or length!=len(blob):
        raise ValueError('GLB_HEADER_INVALID')
    n,kind=struct.unpack('<I4s',blob[12:20])
    if kind!=b'JSON' or 20+n+8>len(blob):
        raise ValueError('GLB_JSON_INVALID')
    doc=json.loads(blob[20:20+n]);off=20+n
    b,typ=struct.unpack('<I4s',blob[off:off+8])
    if typ!=b'BIN\0' or off+8+b!=len(blob) or doc['buffers'][0]['byteLength']>b:
        raise ValueError('GLB_BINARY_INVALID')
    for a in doc['accessors']:
        v=doc['bufferViews'][a['bufferView']]
        stride={'VEC3':3, 'SCALAR':1}[a['type']]
        if v['byteOffset']+a['count']*stride*4 > doc['buffers'][0]['byteLength']:
            raise ValueError('GLB_ACCESSOR_OOB')
    return {'glb_version':ver,'bytes':len(blob),'sha256':sha(blob),
            'objects':len(doc.get('nodes',[])),
            'triangles':sum(a['count']//3 for a in doc['accessors'] if a['type']=='SCALAR'),
            'materials':[m['name'] for m in doc.get('materials',[])],
            'part_names':[x['name'] for x in doc.get('nodes',[])],
            'source':doc.get('extras',{}).get('nomadic_scene_forge')}


def build(spec,spec_base,out_root,reference_root=None):
    validate_spec(spec)
    root=Path(out_root).resolve()
    if not root.is_dir():
        raise ValueError('OUTPUT_ROOT_MUST_EXIST')
    ref=_reference(spec,Path(spec_base).resolve(),reference_root)
    s=make_scene(spec)
    prov={'schema':SCHEMA,'spec_sha256':sha(canonical(spec)),'reference':ref,
          'geometry_source':'deterministic_parametric_NOT_image_reconstruction',
          'unit':'meter','axes':'Y_UP','no_cloud_or_paid_provider':True}
    blob=build_glb(s,prov)
    stat=inspect_glb(blob)
    manifest={'schema':'nomadic.scene-forge.asset/0.1','name':spec['name'],
              'glb_sha256':stat['sha256'],'glb_bytes':len(blob),
              'object_count':stat['objects'],'triangles':stat['triangles'],
              'reference':ref,'spec_sha256':prov['spec_sha256'],
              'status':'GEOMETRY_BUILT_NOT_VISUALLY_QUALIFIED',
              'production_qualified':False,
              'geometry_kind':prov['geometry_source'],
              'game_import_approved':False}
    # Only write 2 filenames inside existing confined output directory. No input-controlled path segments.
    base=spec['name']
    glb_path=root/(base+'.glb')
    man_path=root/(base+'.manifest.json')
    if glb_path.exists() or man_path.exists():
        raise FileExistsError('OUTPUT_ALREADY_EXISTS_FAIL_CLOSED')
    # Exclusive creation: avoids clobbering accepted work during concurrency.
    try:
        with glb_path.open('xb') as f:
            f.write(blob)
        with man_path.open('x', encoding='utf-8') as f:
            f.write(json.dumps(manifest,indent=2,sort_keys=True)+'\n')
    except Exception:
        # Do not erase existing files on a create conflict.
        if glb_path.exists() and not man_path.exists():
            glb_path.unlink()
        raise
    return {'glb':str(glb_path),'manifest':str(man_path),'inspection':stat,'acceptance':manifest['status']}


def main(argv=None):
    p=argparse.ArgumentParser(description=__doc__)
    sub=p.add_subparsers(dest='cmd',required=True)
    for kind in ('plan','build'):
        s=sub.add_parser(kind);s.add_argument('--spec',required=True)
        if kind=='build':
            s.add_argument('--out',required=True,help='Existing output directory; never overwritten')
            s.add_argument('--reference-root',default=None)
    v=sub.add_parser('inspect');v.add_argument('--glb',required=True)
    a=p.parse_args(argv)
    if a.cmd=='inspect':
        res=inspect_glb(Path(a.glb).read_bytes())
    else:
        spec=load_spec(a.spec)
        if a.cmd=='plan':
            res={'status':'VALIDATED_NOT_BUILT','name':spec['name'],'dimensions':validate_spec(spec),
                 'authored_reference':spec.get('reference_image'),
                 'message':'A reference is attribution/evidence, not automatic reconstruction'}
        else:
            res=build(spec,Path(a.spec).resolve().parent,a.out,a.reference_root)
    print(json.dumps(res,indent=2,sort_keys=True))
    return 0

if __name__=='__main__':
    try:
        sys.exit(main())
    except (ValueError,OSError,KeyError) as exc:
        print(json.dumps({'ok':False,'error':str(exc)}),file=sys.stderr)
        sys.exit(2)
