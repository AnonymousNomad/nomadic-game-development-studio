"""Pure-stdlib 8-bit PNG heightmap to local 3D terrain GLB.

Uses input pixels as *elevation*, not inferred depth from an arbitrary photograph.
Offline, deterministic, size bounded, no external libraries or downloads.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
from pathlib import Path
import struct
import sys
import zlib
from scene_forge import Scene, build_glb, inspect_glb, NAME, sha

MAX_SIDE=1024
MAX_FILE=16*1024*1024
PNG_HEADER=b'\x89PNG\r\n\x1a\n'


def read_png_height(path):
    path=Path(path)
    if path.stat().st_size>MAX_FILE:raise ValueError('PNG_TOO_LARGE')
    buf=path.read_bytes()
    if not buf.startswith(PNG_HEADER):raise ValueError('PNG_INVALID_SIGNATURE')
    pos=8; width=height=ctype=None;depth=None; compressed=bytearray();ended=False
    while pos+12<=len(buf):
        n=int.from_bytes(buf[pos:pos+4],'big')
        typ=buf[pos+4:pos+8]
        if n>MAX_FILE or pos+12+n>len(buf):raise ValueError('PNG_CHUNK_INVALID')
        data=buf[pos+8:pos+8+n]
        crc=int.from_bytes(buf[pos+8+n:pos+12+n],'big')
        if zlib.crc32(typ+data)&0xffffffff!=crc:raise ValueError('PNG_CRC_INVALID')
        pos+=12+n
        if typ==b'IHDR':
            if width is not None or n!=13:raise ValueError('PNG_IHDR_INVALID')
            width,height,depth,ctype,comp,filt,interlace=struct.unpack('>IIBBBBB',data)
            if width<2 or height<2 or width>MAX_SIDE or height>MAX_SIDE or depth!=8 or ctype not in (0,2,4,6) or (comp,filt,interlace)!=(0,0,0):
                raise ValueError('PNG_UNSUPPORTED_LAYOUT')
        elif typ==b'IDAT':
            if width is None:raise ValueError('PNG_IDAT_BEFORE_IHDR')
            compressed.extend(data)
            if len(compressed)>MAX_FILE:raise ValueError('PNG_COMPRESSED_TOO_LARGE')
        elif typ==b'IEND':
            ended=True;break
    if not ended or width is None or not compressed:raise ValueError('PNG_INCOMPLETE')
    components={0:1,2:3,4:2,6:4}[ctype]
    rowlen=width*components;rawlen=(rowlen+1)*height
    dec=zlib.decompressobj()
    raw=dec.decompress(bytes(compressed),rawlen+1)
    if len(raw)!=rawlen or dec.unconsumed_tail or not dec.eof or dec.unused_data:
        raise ValueError('PNG_DECOMPRESSION_INVALID')
    previous=bytearray(rowlen);values=[];off=0
    for row in range(height):
        filt=raw[off];off+=1
        scan=bytearray(raw[off:off+rowlen]);off+=rowlen
        if filt>4:raise ValueError('PNG_FILTER_UNSUPPORTED')
        for i in range(rowlen):
            left=scan[i-components] if i>=components else 0
            above=previous[i]
            ul=previous[i-components] if i>=components else 0
            if filt==1:pred=left
            elif filt==2:pred=above
            elif filt==3:pred=(left+above)//2
            elif filt==4:
                pp=left+above-ul
                da,db,dc=abs(pp-left),abs(pp-above),abs(pp-ul)
                pred=left if da<=db and da<=dc else (above if db<=dc else ul)
            else:pred=0
            scan[i]=(scan[i]+pred)&255
        for x in range(width):
            i=x*components
            if ctype in (0,4):value=scan[i]/255.0
            else:value=(.2126*scan[i]+.7152*scan[i+1]+.0722*scan[i+2])/255.0
            values.append(value)
        previous=scan
    return width,height,values


def make_terrain(name,width,height,pixels,*,samples=65,size_m=180.0,relief_m=60.0):
    if not isinstance(name,str) or not NAME.fullmatch(name):raise ValueError('TERRAIN_NAME_INVALID')
    if isinstance(samples,bool) or not isinstance(samples,int) or not (3<=samples<=129):raise ValueError('TERRAIN_SAMPLES_INVALID')
    if not math.isfinite(size_m) or not (1<=size_m<=10000):raise ValueError('TERRAIN_SIZE_INVALID')
    if not math.isfinite(relief_m) or not (0<relief_m<=2000):raise ValueError('TERRAIN_RELIEF_INVALID')
    s=Scene();tris=[]
    def vertex(ix,iy):
        xx=int(round(ix*(width-1)/(samples-1)))
        yy=int(round(iy*(height-1)/(samples-1)))
        return (round((ix/(samples-1)-.5)*size_m,5),
                round(pixels[yy*width+xx]*relief_m,5),
                round((iy/(samples-1)-.5)*size_m,5))
    for y in range(samples-1):
        for x in range(samples-1):
            a=vertex(x,y);b=vertex(x+1,y);c=vertex(x+1,y+1);d=vertex(x,y+1)
            tris.extend(((a,c,b),(a,d,c)))
    s.part('terrain_heightfield','foundation',tris,True)
    return s


def build_terrain(name,input_png,reference_root,output_root,*,samples=65,size_m=180,relief_m=60):
    if not isinstance(name,str) or not NAME.fullmatch(name):raise ValueError('TERRAIN_NAME_INVALID')
    root=Path(reference_root).resolve(strict=True)
    file=(root/input_png).resolve(strict=True)
    if not file.is_relative_to(root):raise ValueError('TERRAIN_INPUT_OUTSIDE_ROOT')
    out=Path(output_root).resolve(strict=True)
    if not out.is_dir():raise ValueError('TERRAIN_OUTPUT_ROOT_INVALID')
    w,h,values=read_png_height(file)
    scene=make_terrain(name,w,h,values,samples=samples,size_m=size_m,relief_m=relief_m)
    prov={'kind':'image_pixel_heights_NOT_photo_depth_inference', 'reference_sha256':sha(file.read_bytes()),
          'unit':'meter','axes':'Y_UP','samples':samples,'size_m':size_m,'relief_m':relief_m,
          'input_width':w,'input_height':h}
    blob=build_glb(scene,prov)
    stats=inspect_glb(blob)
    target=out/(name+'.glb');man=out/(name+'.manifest.json')
    if target.exists() or man.exists():raise FileExistsError('TERRAIN_OUTPUT_EXISTS')
    with target.open('xb') as f:f.write(blob)
    try:
        with man.open('x',encoding='utf-8') as f:
            f.write(json.dumps({'schema':'nomadic.scene-forge.terrain/0.1',
                'input':file.name,'input_sha256':prov['reference_sha256'],
                'geometry':'heightmap_pixel_elevation_not_photo_reconstruction',
                'glb_sha256':stats['sha256'],'triangles':stats['triangles'],
                'production_qualified':False,'status':'TERRAIN_BUILT_NOT_VISUALLY_QUALIFIED'},indent=2)+'\n')
    except Exception:
        target.unlink(missing_ok=True)
        raise
    return {'status':'TERRAIN_BUILT_NOT_VISUALLY_QUALIFIED','glb':str(target),'manifest':str(man),
            'triangles':stats['triangles'],'sha256':stats['sha256']}


def main():
    p=argparse.ArgumentParser()
    p.add_argument('--name',required=True)
    p.add_argument('--input',required=True)
    p.add_argument('--reference-root',required=True)
    p.add_argument('--out',required=True)
    p.add_argument('--samples',type=int,default=65)
    p.add_argument('--size-m',type=float,default=180)
    p.add_argument('--relief-m',type=float,default=60)
    a=p.parse_args()
    print(json.dumps(build_terrain(a.name,a.input,a.reference_root,a.out,samples=a.samples,
                size_m=a.size_m,relief_m=a.relief_m),indent=2))

if __name__=='__main__':
    try:main()
    except (ValueError,OSError,KeyError) as e:
        print(json.dumps({'ok':False,'error':str(e)}),file=sys.stderr);sys.exit(2)
