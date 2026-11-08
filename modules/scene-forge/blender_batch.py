"""Restricted import stage executed INSIDE Blender, not as general model-supplied Python.
Only converts a staged GLB to a source .blend file; no rendering, network, or other assets.
"""
from __future__ import annotations
import argparse
from pathlib import Path
import sys


def main():
    import bpy
    p=argparse.ArgumentParser()
    p.add_argument('--input',required=True)
    p.add_argument('--output',required=True)
    args=p.parse_args(sys.argv[sys.argv.index('--')+1:])
    source=Path(args.input).resolve(strict=True)
    dest=Path(args.output).resolve()
    if source.suffix.lower()!='.glb' or dest.suffix.lower()!='.blend' or source.parent!=dest.parent:
        raise RuntimeError('BLENDER_STAGE_SCOPE_INVALID')
    if dest.exists():
        raise RuntimeError('BLENDER_STAGE_OUTPUT_EXISTS')
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    count=len([x for x in bpy.data.objects if x.type=='MESH'])
    if count<1:
        raise RuntimeError('BLENDER_STAGE_NO_MESHES')
    bpy.context.scene['nsf_stage']='NOT_GAME_ACCEPTED'
    bpy.ops.wm.save_as_mainfile(filepath=str(dest))
    if not dest.is_file():
        raise RuntimeError('BLENDER_STAGE_SAVE_MISSING')
    print('NSF_BLENDER_STAGED_OK',count, str(dest))

if __name__=='__main__':main()
