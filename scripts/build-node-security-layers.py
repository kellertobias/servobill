import hashlib, io, json, pathlib, tarfile, urllib.request, zipfile

root=pathlib.Path(__file__).resolve().parent.parent/'.sst'/'node-security-layers'
root.mkdir(exist_ok=True)
version='22.23.4'
checks=urllib.request.urlopen(f'https://nodejs.org/dist/v{version}/SHASUMS256.txt').read().decode()
wrapper=b'''#!/bin/sh
set -eu
case "${1:-}" in
  */node) shift ;;
  *) echo "Node security wrapper received an unexpected interpreter" >&2; exit 1 ;;
esac
NODE_OPTIONS="${NODE_OPTIONS:-} --require=/opt/node-security/runtime-version.cjs"
export NODE_OPTIONS
exec /opt/node-security/bin/node "$@"
'''
manifest={}
for aws_arch,node_arch in [('x86_64','x64'),('arm64','arm64')]:
    filename=f'node-v{version}-linux-{node_arch}.tar.xz'
    archive=root/filename
    if not archive.exists(): urllib.request.urlretrieve(f'https://nodejs.org/dist/v{version}/{filename}',archive)
    expected=next(l.split()[0] for l in checks.splitlines() if l.endswith(filename))
    assert hashlib.sha256(archive.read_bytes()).hexdigest()==expected
    with tarfile.open(archive) as t:
        binary=t.extractfile(f'node-v{version}-linux-{node_arch}/bin/node').read()
        license=t.extractfile(f'node-v{version}-linux-{node_arch}/LICENSE').read()
    target=root/f'node-security-{version}-{aws_arch}.zip'
    with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        for name,data,mode in [('node-security/bin/node',binary,0o755),('bin/node-security-wrapper',wrapper,0o755),('node-security/LICENSE',license,0o644),('node-security/runtime-version.cjs',b'console.info(JSON.stringify({event:"node-security-runtime",node:process.version,arch:process.arch}));',0o644)]:
            info=zipfile.ZipInfo(name);info.external_attr=(0o100000|mode)<<16;info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,data)
        info=zipfile.ZipInfo('node-security/provenance.json');info.external_attr=0o100644<<16;info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,json.dumps({'upstream':filename,'sha256':expected,'node':version,'architecture':aws_arch}))
    manifest[aws_arch]={'zip':target.name,'bytes':target.stat().st_size,'uncompressed':sum(i.file_size for i in zipfile.ZipFile(target).infolist()),'source_sha256':expected}
    print(aws_arch,manifest[aws_arch],flush=True)
(root/'manifest.json').write_text(json.dumps(manifest,indent=2))
