import json,math,subprocess,hashlib,time,xml.etree.ElementTree as ET
from pathlib import Path
root=Path(__file__).resolve().parent.parent
for id,name,lat,lon in [('cleveland','Cleveland · Ohio City',41.485,-81.708),('san-francisco','San Francisco · Mission',37.759,-122.416),('manhattan','New York · East Village',40.727,-73.986)]:
 target=root/'public/cities'/f'{id}.json'
 dy=600/111320;dx=dy/math.cos(math.radians(lat));box=[lon-dx,lat-dy,lon+dx,lat+dy];url='https://api.openstreetmap.org/api/0.6/map?bbox='+','.join(f'{v:.6f}' for v in box)
 raw=subprocess.check_output(['curl','--fail','--silent','--show-error','--max-time','55','-A','LastlightPortfolio/2.0 github.com/bblevick/tiny-city-lab',url]);tree=ET.fromstring(raw)
 nodes={int(n.attrib['id']):{'lat':float(n.attrib['lat']),'lon':float(n.attrib['lon'])} for n in tree.findall('node')};elements=[]
 for w in tree.findall('way'):
  ids=[int(n.attrib['ref']) for n in w.findall('nd')];tags={t.attrib['k']:t.attrib['v'] for t in w.findall('tag')}
  if not (tags.get('highway') or tags.get('building') or tags.get('leisure')=='park' or tags.get('natural')=='water') or any(i not in nodes for i in ids):continue
  elements.append({'type':'way','id':int(w.attrib['id']),'nodes':ids,'geometry':[nodes[i] for i in ids],'tags':tags})
 retrieved=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime());meta=tree.find('meta');date=meta.attrib.get('osm_base',retrieved) if meta is not None else retrieved
 data=json.dumps({'osm3s':{'timestamp_osm_base':date},'elements':elements},separators=(',',':')).encode();target.write_bytes(data)
 (root/'data'/f'{id}.osm').write_bytes(raw)
 (root/'data'/f'{id}-provenance.json').write_text(json.dumps({'id':id,'name':name,'center':[lat,lon],'bounds':box,'source':url,'retrievedAt':retrieved,'rawSHA256':hashlib.sha256(raw).hexdigest(),'normalizedSHA256':hashlib.sha256(data).hexdigest(),'license':'ODbL-1.0','attribution':'© OpenStreetMap contributors','normalization':'Node references resolved to way geometry; selected streets, building footprints, water and parks; relations omitted.'},indent=2))
 print(id,len(elements),len(raw),len(data),flush=True)
 time.sleep(2)
