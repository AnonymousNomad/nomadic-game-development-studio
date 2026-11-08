#!/usr/bin/env python3
"""Minimal MCP stdio tool server for Nomadic Scene Forge. Python standard library only.

No arbitrary Python execution, network listener, download, API key, or dynamic tool installs.
"""
from __future__ import annotations
import json
import os
from pathlib import Path
import sys
from scene_forge import SCHEMA, validate_spec, make_scene, build, inspect_glb

TOOLS=[
 {'name':'nsf_plan_aframe','description':'Validate a declarative A-frame blueprint without any side effect; this does NOT reconstruct an image.',
  'inputSchema':{'type':'object','properties':{'spec':{'type':'object'}},'required':['spec'],'additionalProperties':False}},
 {'name':'nsf_build_aframe','description':'Generate an offline GLB + manifest inside a preconfigured output root. Needs NSF_ALLOW_WRITES=1 and an independent Resource Admission grant before live invocation.',
  'inputSchema':{'type':'object','properties':{'spec':{'type':'object'}},'required':['spec'],'additionalProperties':False}},
 {'name':'nsf_build_terrain','description':'Convert a local grayscale/RGB PNG heightmap into real terrain mesh GLB. Pixels are interpreted as elevation; not automatic photo geometry. Disabled unless NSF_ALLOW_WRITES=1.',
  'inputSchema':{'type':'object','properties':{'name':{'type':'string'},'image':{'type':'string'},'samples':{'type':'integer'},'size_m':{'type':'number'},'relief_m':{'type':'number'}},'required':['name','image'],'additionalProperties':False}},
 {'name':'nsf_blender_stage_blend','description':'Offline controlled GLB-to-Blender source stage with fixed script. Disabled unless NSF_ALLOW_BLENDER=1; resource admission remains responsibility of invoking worker.',
  'inputSchema':{'type':'object','properties':{'name':{'type':'string'}},'required':['name'],'additionalProperties':False}},
 {'name':'nsf_inspect_glb','description':'Inspect a generated GLB within the preconfigured output root without editing it.',
  'inputSchema':{'type':'object','properties':{'name':{'type':'string'}} ,'required':['name'],'additionalProperties':False}},
]

def reply(mid,result=None,error=None):
    v={'jsonrpc':'2.0','id':mid}
    if error:v['error']=error
    else:v['result']=result
    sys.stdout.write(json.dumps(v,separators=(',',':'))+'\n');sys.stdout.flush()


def tool_result(value,error=False):
    return {'content':[{'type':'text','text':json.dumps(value,sort_keys=True)}],'isError':error}


def handle(msg):
    mid=msg.get('id',None)
    method=msg.get('method')
    if method=='notifications/initialized':
        return
    if method=='initialize':
        reply(mid,{'protocolVersion':'2024-11-05','capabilities':{'tools':{'listChanged':False}},
                   'serverInfo':{'name':'nomadic-scene-forge','version':'0.1.0'}})
    elif method=='ping':reply(mid,{})
    elif method=='tools/list':reply(mid,{'tools':TOOLS})
    elif method=='tools/call':
        p=msg.get('params',{})
        try:
            name=p.get('name'); args=p.get('arguments',{})
            if not isinstance(args,dict): raise ValueError('ARGUMENTS_INVALID')
            if name not in [tool['name'] for tool in TOOLS]:raise ValueError('UNKNOWN_TOOL')
            if name=='nsf_build_terrain':
                if set(args)-{'name','image','samples','size_m','relief_m'} or not {'name','image'}<=set(args):raise ValueError('ARGUMENTS_INVALID')
                if os.getenv('NSF_ALLOW_WRITES')!='1':raise ValueError('WRITES_NOT_AUTHORIZED')
                from terrain_forge import build_terrain
                result=build_terrain(args['name'],args['image'],os.environ['NSF_REFERENCE_ROOT'],
                          os.environ['NSF_OUTPUT_ROOT'],samples=args.get('samples',65),
                          size_m=args.get('size_m',180),relief_m=args.get('relief_m',60))
            elif name=='nsf_blender_stage_blend':
                if set(args)!={'name'}:raise ValueError('ARGUMENTS_INVALID')
                if os.getenv('NSF_ALLOW_BLENDER')!='1':raise ValueError('BLENDER_EXECUTION_NOT_AUTHORIZED')
                from blender_bridge import stage_blend
                result=stage_blend(args['name'],os.environ['NSF_OUTPUT_ROOT'],os.environ['NSF_BLENDER_EXE'])
            elif name=='nsf_inspect_glb':
                if set(args)!={'name'}:raise ValueError('ARGUMENTS_INVALID')
                n=args['name']
                from scene_forge import NAME
                if not isinstance(n,str) or not NAME.fullmatch(n):raise ValueError('NAME_INVALID')
                root=Path(os.environ['NSF_OUTPUT_ROOT']).resolve(strict=True)
                result=inspect_glb((root/(n+'.glb')).read_bytes())
            else:
                if set(args)!={'spec'}:raise ValueError('ARGUMENTS_INVALID')
                spec=args['spec'];c=validate_spec(spec)
                if name=='nsf_plan_aframe':
                    result={'status':'VALIDATED_NOT_BUILT','dimensions':c,'name':spec['name'],
                            'image_to_3d_inference':'NOT_IMPLEMENTED'}
                else:
                    if os.getenv('NSF_ALLOW_WRITES')!='1':raise ValueError('WRITES_NOT_AUTHORIZED')
                    root=Path(os.environ['NSF_OUTPUT_ROOT']).resolve(strict=True)
                    refbase=Path(os.environ['NSF_REFERENCE_ROOT']).resolve(strict=True)
                    result=build(spec,refbase,root,refbase)
            reply(mid,tool_result(result))
        except (OSError,ValueError,KeyError) as e:
            reply(mid,tool_result({'code':type(e).__name__,'reason':str(e)},True))
    elif mid is not None:
        reply(mid,error={'code':-32601,'message':'Method not found'})


def main():
    for line in sys.stdin:
        try:
            msg=json.loads(line)
            if not isinstance(msg,dict):raise ValueError('JSON_RPC_OBJECT_REQUIRED')
            handle(msg)
        except (ValueError,TypeError,KeyError) as e:
            reply(None,error={'code':-32600,'message':str(e)})

if __name__=='__main__':main()
