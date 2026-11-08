"""Controlled Blender GLB->.blend conversion, no arbitrary Python or network inputs."""
from __future__ import annotations
import os
import re
import subprocess
from pathlib import Path
from scene_forge import inspect_glb, NAME, sha


def stage_blend(name, output_root, blender_executable, *, timeout_seconds=120):
    if not isinstance(name,str) or not NAME.fullmatch(name):
        raise ValueError('BLENDER_NAME_INVALID')
    root=Path(output_root).resolve(strict=True)
    source=root/(name+'.glb')
    target=root/(name+'.blend')
    blender=Path(blender_executable).resolve(strict=True)
    if not source.is_file() or not blender.is_file():
        raise ValueError('BLENDER_INPUT_OR_EXE_MISSING')
    if target.exists():
        raise FileExistsError('BLENDER_OUTPUT_ALREADY_EXISTS')
    original=sha(source.read_bytes())
    inspect_glb(source.read_bytes())
    cmd=[str(blender),'--background','--factory-startup','--python',str(Path(__file__).with_name('blender_batch.py')),
         '--','--input',str(source),'--output',str(target)]
    # Only launch via Resource-Admission-authorized worker. This module has no system grant authority.
    try:
        result=subprocess.run(cmd,capture_output=True,text=True,timeout=timeout_seconds,check=False,
                              stdin=subprocess.DEVNULL)
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError('BLENDER_STAGE_TIMEOUT') from exc
    if result.returncode!=0 or not target.is_file():
        raise RuntimeError('BLENDER_STAGE_FAILED exit='+str(result.returncode)+' tail='+(result.stderr or result.stdout)[-600:])
    if sha(source.read_bytes())!=original:
        raise RuntimeError('BLENDER_INPUT_CHANGED_DURING_STAGE')
    return {'status':'BLENDER_STAGED_NOT_RENDER_VERIFIED','source_sha256':original,
            'blend':str(target),'blend_sha256':sha(target.read_bytes()),
            'blend_bytes':target.stat().st_size,'production_qualified':False}
