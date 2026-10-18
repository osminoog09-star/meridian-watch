extends RefCounted
# Shared low-poly city bus, built once. No extra nodes per window or wheel.
static func build() -> Mesh:
 var st := SurfaceTool.new()
 st.begin(Mesh.PRIMITIVE_TRIANGLES)
 var boxes = preload("res://scripts/service_models.gd")
 boxes.box(st,Vector3(0,1.7,0),Vector3(10.5,2.6,2.4),Color("e8e4d5"))
 for side in [-1.0,1.0]:
  boxes.box(st,Vector3(0,1.1,side*1.21),Vector3(10.3,0.5,0.025),Color("247c80"))
  for i in range(7):
   boxes.box(st,Vector3(-4.25+i*1.35,2.2,side*1.22),Vector3(1.16,0.95,0.025),Color("294653"))
  for x in [-3.2,3.2]:
   boxes.box(st,Vector3(x,0.5,side*1.16),Vector3(0.95,0.95,0.25),Color("262c30"))
 boxes.box(st,Vector3(5.26,2.15,0),Vector3(0.025,1.1,2.1),Color("294653"))
 for side in [-0.85,0.85]:
  boxes.box(st,Vector3(5.27,0.9,side),Vector3(0.03,0.22,0.32),Color("fff1bc"))
  boxes.box(st,Vector3(-5.27,0.9,side),Vector3(0.03,0.22,0.25),Color("b63232"))
 # Front and centre passenger doors on the right side.
 for x in [3.9,-0.4]:
  boxes.box(st,Vector3(x,1.7,1.24),Vector3(0.9,2.1,0.025),Color("344c52"))
 st.index()
 return st.commit()
