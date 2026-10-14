"""Original upholstered concept, derived from approved image A, not production CAD.
Blender 5.1 / Cycles. Coordinates X lateral, -Y front, Z up.
python build.py [preview|sequence|home] --count 181
"""
import sys, math, json, argparse, time
from pathlib import Path
P=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(P.parents[1]/'.codex-temp/chair-builddeps'))
import bpy
from mathutils import Vector
parser=argparse.ArgumentParser();parser.add_argument('mode',nargs='?',default='preview');parser.add_argument('--count',type=int,default=181);parser.add_argument('--start',type=int,default=0);args=parser.parse_args()
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=64;scene.cycles.use_denoising=True
prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='OPTIX';prefs.get_devices()
for d in prefs.devices:d.use=d.type=='OPTIX'
scene.cycles.device='GPU';scene.cycles.max_bounces=8;scene.cycles.diffuse_bounces=4;scene.cycles.glossy_bounces=4
scene.render.resolution_x=1600;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.use_persistent_data=True
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=.25
world=bpy.data.worlds.new('Ivory atelier');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.75,.78,.84,1);world.node_tree.nodes['Background'].inputs[1].default_value=.15;scene.world=world

def mat(name,color,metal=0,rough=.5):
 m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,1);s=m.node_tree.nodes.get('Principled BSDF');s.inputs['Base Color'].default_value=(*color,1);s.inputs['Metallic'].default_value=metal;s.inputs['Roughness'].default_value=rough;return m

cloth=mat('Sage wool blend / opaque',(.20,.245,.13),0,.86)
nt=cloth.node_tree;n=nt.nodes;l=nt.links;bs=n.get('Principled BSDF');bs.inputs['Sheen Weight'].default_value=.12;bs.inputs['Sheen Roughness'].default_value=.8
tex=n.new('ShaderNodeTexCoord')
# Fine crossing yarns with broad slub variation. No alpha / transmission.
noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=680;noise.inputs['Detail'].default_value=3;noise.inputs['Roughness'].default_value=.75;l.new(tex.outputs['Generated'],noise.inputs['Vector'])
ramp=n.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.15;ramp.color_ramp.elements[0].color=(.09,.12,.053,1);ramp.color_ramp.elements[1].position=.85;ramp.color_ramp.elements[1].color=(.29,.335,.18,1);l.new(noise.outputs['Fac'],ramp.inputs[0]);l.new(ramp.outputs['Color'],bs.inputs['Base Color'])
wave1=n.new('ShaderNodeTexWave');wave1.bands_direction='X';wave1.inputs['Scale'].default_value=380;wave1.inputs['Distortion'].default_value=2;wave1.inputs['Detail Scale'].default_value=2;l.new(tex.outputs['Generated'],wave1.inputs['Vector'])
wave2=n.new('ShaderNodeTexWave');wave2.bands_direction='Z';wave2.inputs['Scale'].default_value=470;wave2.inputs['Distortion'].default_value=1.5;l.new(tex.outputs['Generated'],wave2.inputs['Vector'])
mix=n.new('ShaderNodeMath');mix.operation='MULTIPLY';l.new(wave1.outputs['Color'],mix.inputs[0]);l.new(wave2.outputs['Color'],mix.inputs[1])
bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.3;bump.inputs['Distance'].default_value=.0011;l.new(mix.outputs[0],bump.inputs['Height']);l.new(bump.outputs[0],bs.inputs['Normal'])
# Authored flat textile scan: object-space box projection maintains real yarn scale.
mapping=n.new('ShaderNodeVectorMath');mapping.operation='SCALE';mapping.inputs[3].default_value=4.6;l.new(tex.outputs['Object'],mapping.inputs[0])
weave=n.new('ShaderNodeTexImage');weave.image=bpy.data.images.load(str(Path(__file__).parent/'sage-weave.png'));weave.projection='BOX';weave.projection_blend=.2;l.new(mapping.outputs[0],weave.inputs['Vector'])
tint=n.new('ShaderNodeMixRGB');tint.blend_type='MULTIPLY';tint.inputs[0].default_value=1;tint.inputs[2].default_value=(.25,.28,.21,1);l.new(weave.outputs['Color'],tint.inputs[1]);l.new(tint.outputs[0],bs.inputs['Base Color']);l.new(weave.outputs['Color'],bump.inputs['Height']);bump.inputs['Distance'].default_value=.0008;bump.inputs['Strength'].default_value=.4
seam=mat('Olive tailored welt',(.105,.13,.065),0,.92)
thread=mat('Sage stitching',(.28,.31,.19),0,.92)
alloy=mat('Champagne bead brushed aluminium',(.48,.43,.34),.9,.29)
nt=alloy.node_tree;grain=nt.nodes.new('ShaderNodeTexNoise');grain.inputs['Scale'].default_value=340;grain.inputs['Detail'].default_value=2
bump=nt.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.13;bump.inputs['Distance'].default_value=.00025;nt.links.new(grain.outputs['Fac'],bump.inputs['Height']);nt.links.new(bump.outputs['Normal'],nt.nodes.get('Principled BSDF').inputs['Normal'])
metal=mat('Satin nickel piston',(.42,.42,.37),.95,.23)
shell=mat('Warm mineral underside',(.26,.265,.20),.1,.62)
rubber=mat('Warm graphite elastomer',(.035,.037,.032),0,.78)
hardware=mat('Graphite mechanism',(.055,.058,.047),.25,.47)
parts={}
for name in ['back','seat','arm_left','arm_right','mechanism','base']:
 o=bpy.data.objects.new(name,None);scene.collection.objects.link(o);o.scale.x=1.12;parts[name]=o

def finish(o,m,part):
 o.data.materials.append(m);o.parent=parts[part]
 if o.type=='MESH':
  for poly in o.data.polygons:poly.use_smooth=True
 return o

def mesh(name,v,f,m,part,sub=0):
 data=bpy.data.meshes.new(name);data.from_pydata(v,[],f);data.update();o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);finish(o,m,part)
 if sub:
  mod=o.modifiers.new('Upholstery continuity','SUBSURF');mod.levels=sub;mod.render_levels=sub
 return o

def tube(name,points,r,m,part,cyclic=False):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=12;c.bevel_depth=r;c.bevel_resolution=3;s=c.splines.new('POLY');s.points.add(len(points)-1)
 for p,co in zip(s.points,points):p.co=(*co,1)
 s.use_cyclic_u=cyclic;o=bpy.data.objects.new(name,c);scene.collection.objects.link(o);return finish(o,m,part)

def box(name,loc,dims,m,part,r=.008):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=dims;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 mod=o.modifiers.new('Radiused tooling','BEVEL');mod.width=r;mod.segments=6;o.modifiers.new('Surface normals','WEIGHTED_NORMAL');return finish(o,m,part)

def cylinder(name,a,b,r,m,part,r2=None,N=48):
 a,b=Vector(a),Vector(b);d=b-a;bpy.ops.mesh.primitive_cone_add(vertices=N,radius1=r,radius2=r if r2 is None else r2,depth=d.length,location=(a+b)/2);o=bpy.context.object;o.name=name;o.rotation_mode='QUATERNION';o.rotation_quaternion=d.to_track_quat('Z','Y')
 mod=o.modifiers.new('Turned edge','BEVEL');mod.width=min(.0015,r*.12);mod.segments=3;o.modifiers.new('Surface normals','WEIGHTED_NORMAL');return finish(o,m,part)

def signed(v,e):return math.copysign(abs(v)**e,v)

# Rounded closed cushion via superellipsoid; warp into a body-specific profile.
def cushion(name,fn,m,part,vertical=.43,horizontal=.42):
 U,V=112,56;verts=[];faces=[]
 for j in range(V+1):
  lat=-math.pi/2+math.pi*j/V
  for i in range(U):
   a=2*math.pi*i/U
   x=signed(math.cos(lat),vertical)*signed(math.cos(a),horizontal)
   y=signed(math.cos(lat),vertical)*signed(math.sin(a),horizontal)
   z=signed(math.sin(lat),vertical)
   verts.append(fn(x,y,z))
 for j in range(V):
  for i in range(U):faces.append((j*U+i,j*U+(i+1)%U,(j+1)*U+(i+1)%U,(j+1)*U+i))
 return mesh(name,verts,faces,m,part,1)

def backshape(x,y,z):
 t=(z+1)/2;w=.178+.020*math.sin(t*math.pi)+.040*t
 # Side wings lean toward the occupant; centre is subtly recessed.
 cy=.23+.135*t-.075*math.sin(math.pi*t)-.022*x*x
 depth=.048+.012*math.sin(math.pi*t)
 # A shallow central tailoring channel on the front face.
 crease=.0035*math.exp(-(x/.027)**2)*max(0,-y)
 return (x*w,cy+y*depth+crease,.905+z*.345)

back_object=cushion('Sculpted continuous upholstered back',backshape,cloth,'back')
bpy.context.view_layer.update()
back_surface=back_object.evaluated_get(bpy.context.evaluated_depsgraph_get())
def backedge(t,offset=0):
 x=signed(math.cos(t),.42)*.994;z=signed(math.sin(t),.42)*.994
 p=backshape(x,0,z);return (p[0],p[1]-.004+offset,p[2])
tube('Back continuous tailored welt',[backedge(i*math.tau/360) for i in range(360)],.0015,seam,'back',True)
# Twin fine stitch lines at the central front channel, with segmented threads.
def front_point(x,z,offset=0):
 f=max(0,1-abs(z)**(2/.43))**(.43/2)
 y=-f*max(0,1-(abs(x)/max(f,.001))**(2/.42))**(.42/2)
 p=backshape(x,y,z);hit,location,normal,index=back_surface.ray_cast(Vector((p[0],-1,p[2])),Vector((0,1,0)))
 return (p[0],(location.y if hit else p[1])-.00055-offset,p[2])
for side in [-1,1]:
 points=[]
 for i in range(181):
  z=-.89+1.82*i/180;points.append(front_point(side*.017,z))
 tube('Back centre seam',points,.00048,seam,'back')
 for i in range(0,180,3):
  ps=[]
  for j in [i,i+1]:
   ps.append(front_point(side*.030,-.89+1.82*j/180,.00015))
  tube('Back double stitch',ps,.00035,thread,'back')

# Shallow sculpted rear shell and exposed wishbone spine, visible in close-up turns.
def rearshape(x,y,z):
 t=(z+1)/2;bulge=math.sin(math.pi*t)**.8
 w=.189+.045*math.sin(math.pi*t)+.026*t
 cy=.280+.13*t-.050*math.sin(math.pi*t)-.157*abs(x)**2.6*bulge
 return (x*w,cy+y*(.028+.008*bulge),.905+z*.347)
cushion('Rear upholstered cover',rearshape,cloth,'back')
# Continuous rear wrap forms both wings, rather than attaching separate bolsters.
for side in [-1,1]:
 pts=[]
 for i in range(40):
  t=i/39;pts.append((side*(.018+.145*t),.267+.035*t,.51+.37*t))
 tube('Cast wishbone rear support',pts,.013,alloy,'back')
 cylinder('Back hinge axle',(side*.13,.245,.565),(side*.177,.245,.565),.026,hardware,'back')
 cylinder('Back satin hinge cap',(side*.177,.245,.565),(side*.182,.245,.565),.018,alloy,'back')
 for z in [.66,.79]:cylinder('Recessed rear fastener',(side*.08,.286,z),(side*.08,.291,z),.0045,metal,'back',N=6)
badge=box('Brushed brand plate',(0,.304,1.11),(.057,.0025,.013),alloy,'back',.002)

def seatshape(x,y,z):
 return (x*(.286-.015*y),-.045+y*.268,.514+z*.092-.028*max(-y,0)**3-.025*(1-x*x)*(1-y*y)*max(z,0)+.010*x*x)
cushion('Full opaque waterfall cushion',seatshape,cloth,'seat',.72)
outline=[]
for i in range(360):
 a=i*math.tau/360;x=signed(math.cos(a),.42);y=signed(math.sin(a),.42);z=-.58+.90*(y+1)/2;f=(1-abs(z)**(2/.72))**(.72/2);p=seatshape(x*f,y*f,z);outline.append(p)
tube('Seat edge piping',outline,.0016,seam,'seat',True)
for i in range(0,360,3):
 ps=[(outline[j%360][0]*1.003,outline[j%360][1],outline[j%360][2]+.004) for j in [i,i+1]];tube('Seat edge stitch',ps,.00035,thread,'seat')
def seatpan(x,y,z):
 return (x*(.252-.011*y),-.025+y*.226,.446+z*.016)
cushion('Underseat mineral shell',seatpan,shell,'seat')
for side in [-1,1]:
 for y in [-.14,.12]:cylinder('Seat metal socket',(side*.15,y,.418),(side*.15,y,.444),.013,alloy,'seat')

# Cast ribbon arm supports: oval sections follow a fluid S-profile.
def sweep(name,points,width,depth,m,part,taper=None):
 verts=[];faces=[];N=16
 for i,p in enumerate(points):
  t=i/(len(points)-1);tangent=(Vector(points[min(i+1,len(points)-1)])-Vector(points[max(i-1,0)])).normalized();a=Vector((1,0,0));b=tangent.cross(a).normalized();a=b.cross(tangent).normalized();scale=taper(t) if taper else 1
  for j in range(N):
   th=math.tau*j/N;v=Vector(p)+a*width*math.cos(th)*scale+b*depth*math.sin(th)*scale;verts.append(tuple(v))
 for i in range(len(points)-1):
  for j in range(N):faces.append((i*N+j,i*N+(j+1)%N,(i+1)*N+(j+1)%N,(i+1)*N+j))
 faces.extend([tuple(reversed(range(N))),tuple((len(points)-1)*N+j for j in range(N))]);return mesh(name,verts,faces,m,part,1)

def bezier(a,b,c,d,t):return tuple((1-t)**3*a[i]+3*(1-t)**2*t*b[i]+3*(1-t)*t*t*c[i]+t**3*d[i] for i in range(3))
for side,part in [(-1,'arm_left'),(1,'arm_right')]:
 controls=[((.15,.10,.419),(.30,.18,.408),(.32,.20,.441),(.311,.16,.508)),((.311,.16,.508),(.303,.12,.603),(.291,-.048,.764),(.290,-.075,.776))]
 pts=[]
 for segment,control in enumerate(controls):
  for i in range(40):
   if segment and i==0:continue
   x,y,z=bezier(*control,i/39);pts.append((side*x,y,z))
 sweep('Sculpted champagne arm ribbon',pts,.021,.023,alloy,part)
 # Trumpet-shaped transition is a defining feature of the approved arm support.
 vv=[];ff=[];R=48;S=24
 for j in range(S+1):
  t=j/S;rx=.022+.026*t*t;ry=.026+.095*t*t;cy=-.036-.039*t;zz=.729+.049*t
  for k in range(R):
   a=k*math.tau/R;vv.append((side*.29+rx*math.cos(a),cy+ry*math.sin(a),zz))
 for j in range(S):
  for k in range(R):ff.append((j*R+k,j*R+(k+1)%R,(j+1)*R+(k+1)%R,(j+1)*R+k))
 ff.append(tuple(S*R+k for k in range(R)));mesh('Flared integrated arm crown',vv,ff,alloy,part,1)
 def armpad(x,y,z,s=side):return (s*.29+x*.047,-.075+y*.15,.799+z*.018-.008*y)
 cushion('Sage upholstered arm pad',armpad,cloth,part,.75,.6)
 outline=[armpad(signed(math.cos(i*math.tau/180),.6)*.985,signed(math.sin(i*math.tau/180),.6)*.985,-.25) for i in range(180)];tube('Arm pad seam',outline,.0008,seam,part,True)
 def carrier(x,y,z,s=side):return (s*.29+x*.045,-.075+y*.143,.781+z*.005-.008*y)
 cushion('Flowing arm pad carrier',carrier,alloy,part,.75,.6)
 cylinder('Arm swivel bearing',(side*.29,-.07,.765),(side*.29,-.07,.776),.019,hardware,part)
 cylinder('Arm socket cap',(side*.162,.1,.418),(side*.19,.1,.418),.011,metal,part)
 box('Underside adjustment tab',(side*.31,-.013,.758),(.015,.033,.007),hardware,part,.003)

box('Tilt mechanism lower housing',(0,.025,.408),(.195,.248,.061),hardware,'mechanism',.020)
box('Carrier plate',(0,.008,.441),(.263,.259,.015),alloy,'mechanism',.007)
for side in [-1,1]:
 for y in [-.087,.103]:cylinder('Hex mounting bolt',(side*.088,y,.448),(side*.088,y,.453),.007,metal,'mechanism',N=6)
cylinder('Tension shaft',(.079,-.02,.409),(.22,-.02,.409),.007,metal,'mechanism')
cylinder('Knurled adjustment wheel',(.21,-.02,.409),(.249,-.02,.409),.023,hardware,'mechanism')
for i in range(40):
 a=i*math.tau/40;cylinder('Fine grip knurl',(.218,-.02+.023*math.cos(a),.409+.023*math.sin(a)),(.244,-.02+.023*math.cos(a),.409+.023*math.sin(a)),.0008,rubber,'mechanism',N=6)
tube('Height control lever',[(-.045,.018,.403),(-.13,-.067,.407),(-.217,-.101,.42)],.005,metal,'mechanism')
box('Satin lever paddle',(-.218,-.10,.419),(.063,.032,.011),alloy,'mechanism',.005)
cylinder('Gas lift dark sleeve',(0,0,.152),(0,0,.265),.026,hardware,'base')
cylinder('Precision piston',(0,0,.252),(0,0,.347),.016,metal,'base')
cylinder('Lift collar',(0,0,.157),(0,0,.181),.033,alloy,'base')
cylinder('Cast central hub',(0,0,.11),(0,0,.172),.051,alloy,'base',r2=.035)
for k in range(5):
 a=math.tau*k/5+.28;dx,dy=math.cos(a),math.sin(a)
 pts=[(dx*(.025+.307*t),dy*(.025+.307*t),.14-.057*t+.008*math.sin(math.pi*t)) for t in [i/36 for i in range(37)]]
 # Low, flat cast spokes with a gentle raised crown.
 verts=[];faces=[];N=12
 for i,p in enumerate(pts):
  t=i/36;w=.032*(1-.55*t);h=.024*(1-.50*t)
  for j in range(N):
   th=math.tau*j/N;verts.append((p[0]-dy*w*signed(math.cos(th),.35),p[1]+dx*w*signed(math.cos(th),.35),p[2]+h*signed(math.sin(th),.38)))
 for i in range(36):
  for j in range(N):faces.append((i*N+j,i*N+(j+1)%N,(i+1)*N+(j+1)%N,(i+1)*N+j))
 faces.extend([tuple(reversed(range(N))),tuple(36*N+j for j in range(N))]);mesh('Champagne five star cast spoke',verts,faces,alloy,'base',1)
 x,y=dx*.333,dy*.333;cylinder('Castor swivel stem',(x,y,.034),(x,y,.084),.008,metal,'base')
 box('Wheel bridge',(x,y,.047),(.043,.035,.028),hardware,'base',.009)
 tangent=Vector((-dy,dx,0));center=Vector((x,y,.031))
 for side in [-1,1]:
  c=center+tangent*.020*side;cylinder('Dual soft tread',c-tangent*.0085,c+tangent*.0085,.030,rubber,'base',N=64)
  c2=c+tangent*.009*side;cylinder('Inset castor disc',c2,c2+tangent*.001*side,.024,hardware,'base',N=64)
  cylinder('Wheel hub medallion',c2,c2+tangent*.0015*side,.009,hardware,'base',N=48)

# Studio and camera are separate from the six assemblies.
floorMat=mat('Warm ivory studio floor',(.78,.75,.68),0,.9)
profile=[(-200,-.002),(3,-.002)]+[(3+3*math.sin(i*math.pi/80),3-3*math.cos(i*math.pi/80)-.002) for i in range(1,41)]+[(6,200)]
v=[(x,y,z) for y,z in profile for x in [-200,200]];f=[(2*i,2*i+1,2*i+3,2*i+2) for i in range(len(profile)-1)]
data=bpy.data.meshes.new('Seamless cove');data.from_pydata(v,[],f);data.update();floor=bpy.data.objects.new('Cyclorama',data);scene.collection.objects.link(floor);data.materials.append(floorMat)
for poly in data.polygons:poly.use_smooth=True
def area(name,loc,power,color,size,target=(0,0,.6)):
 data=bpy.data.lights.new(name,'AREA');data.energy=power;data.color=color;data.shape='DISK';data.size=size;o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
area('Large warm window',(-3,-4,5),550,(1,.94,.83),3)
area('Cool broad fill',(3,-1,2.8),100,(.85,.91,1),3)
area('Soft edge light',(1,3,3.5),480,(1,.92,.8),2.5)
bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.type='PERSP';cam.data.sensor_fit='VERTICAL';cam.data.sensor_height=32;cam.data.lens=32/(2*math.tan(math.radians(16)));cam.data.clip_start=.01

zero={n:[0,0,0] for n in parts}
exploded={'back':[0,.37,-.18],'seat':[0,.24,.30],'arm_left':[-.25,.29,.04],'arm_right':[.25,.29,.04],'mechanism':[0,.07,0],'base':[0,0,0]}
backpose={**exploded,**{n:[-8,0,0] for n in ['seat','arm_left','mechanism','base']},'arm_right':[8,0,0]}
seatpose={**exploded,'seat':[0,.25,.46],**{n:[-8,0,0] for n in ['back','arm_left','mechanism','base']},'arm_right':[8,0,0]}
armpose={**exploded,'arm_right':[.36,.29,.03],**{n:[-8,0,0] for n in ['back','seat','arm_left','mechanism','base']}}
# Same left-copy / right-product arrangement and six editorial chapters.
shots=[
 (0,0,.59,0,.54,.53,3.05,.30,zero),(.09,0,.59,0,.42,.53,3.05,.30,zero),
 (.21,0,.85,.02,.30,.55,3.95,.30,exploded),(.265,0,.85,.02,.25,.55,3.95,.30,exploded),
 (.365,0,1.24,-.41,-.30,.12,1.85,.32,backpose),(.43,0,1.24,-.41,.10,.14,1.85,.32,backpose),
 (.535,0,.75,.48,.50,.73,1.52,.32,seatpose),(.595,0,.75,.48,.18,.77,1.52,.32,seatpose),
 (.70,.64,.99,.045,.72,.30,1.03,.32,armpose),(.765,.64,.99,.045,.40,.32,1.03,.32,armpose),
 (.85,0,.85,.02,.30,.55,3.95,.30,exploded),(.965,0,.59,0,.54,.53,3.05,.30,zero),(1,0,.59,0,.54,.53,3.05,.30,zero)]
def set_progress(p):
 idx=next((i for i in range(1,len(shots)) if shots[i][0]>=p),len(shots)-1);a,b=shots[idx-1],shots[idx];t=max(0,min(1,(p-a[0])/(b[0]-a[0])));t=4*t*t*t if t<.5 else 1-((-2*t+2)**3)/2
 vals=[a[i]+(b[i]-a[i])*t for i in range(1,8)];tx,ty,tz,az,el,dist,shift=vals
 look=Vector((tx,-tz,ty));cam.location=(tx+math.sin(az)*dist,-(tz+math.cos(az)*dist),ty+el);cam.rotation_euler=(look-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.shift_x=-shift
 for n,o in parts.items():
  v=[a[-1][n][i]+(b[-1][n][i]-a[-1][n][i])*t for i in range(3)];o.location=(v[0],-v[2],v[1]-(.05 if n!='base' else 0))
 bpy.context.view_layer.update()

out=P/'public/products/contour-sage/frames';out.mkdir(parents=True,exist_ok=True)
evidence=P/'evidence/product-sage';evidence.mkdir(parents=True,exist_ok=True)
def render(path):scene.render.filepath=str(path);bpy.ops.render.render(write_still=True)
set_progress(0)
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(P/'model-source/contour-sage/contour-sage.blend'))
manifest={'design':'Contour 01 / Sage Textile, original study based on approved concept A','renderer':'Blender 5.1 Cycles OptiX','parts':list(parts),'source':'concepts/contour-directions.png','count':args.count,'width':1600,'height':1000,'format':'webp','freeCamera':False}
if args.mode=='reference':
 scene.render.resolution_x=1000;scene.render.resolution_y=1200;scene.cycles.samples=96;cam.data.shift_x=0;cam.data.lens=68
 cam.location=(1.58,-3.3,1.26);look=Vector((0,0,.60));cam.rotation_euler=(look-cam.location).to_track_quat('-Z','Y').to_euler();render(evidence/'reference-match.png')
elif args.mode=='preview':
 scene.render.resolution_percentage=80;scene.cycles.samples=48
 for label,p in [('hero',0),('exploded',.225),('back',.39),('seat',.56),('arm',.73)]:set_progress(p);render(evidence/f'{label}-draft.png')
elif args.mode=='sequence':
 scene.cycles.samples=48
 for i in range(args.start,args.count):
  set_progress(i/(args.count-1));render(out/f'{i:03}.png');print(f'FRAME {i+1}/{args.count}',flush=True)
 (out.parent/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
elif args.mode=='home':
 set_progress(0);floor.hide_render=True;scene.render.film_transparent=True;scene.render.resolution_x=1200;scene.render.resolution_y=1400;scene.cycles.samples=96;cam.data.shift_x=0
 cam.location=(1.6,-2.9,1.55);look=Vector((0,0,.61));cam.rotation_euler=(look-cam.location).to_track_quat('-Z','Y').to_euler();cam.rotation_euler.rotate_axis('Z',math.radians(-20));cam.data.lens=64
 render(P/'public/images/floating/chair-sage.png')
print('DONE',args.mode,flush=True)
