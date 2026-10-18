extends RefCounted
# CITY-01: independent architectural kit. Metres, shared vertex-color material.
const Parts = preload("res://scripts/service_models.gd")
const Geometry = preload("res://scripts/city_geometry.gd")
static func building(width: float,depth: float,floors: int,kind: String,tint: Color) -> Mesh:
 var st := SurfaceTool.new()
 st.begin(Mesh.PRIMITIVE_TRIANGLES)
 var height := floors*3.2
 var trim := Color("e1dccb")
 var glass := Color("30444c")
 Parts.box(st,Vector3(0,height/2,0),Vector3(width,height,depth),tint)
 Parts.box(st,Vector3(0,0.3,0),Vector3(width+0.08,0.6,depth+0.08),Color("79776e"))
 for side in [-1.0,1.0]:
  var z: float = side*(depth/2+0.10)
  var columns := maxi(2,int(width/3.1))
  for floor_index in range(floors):
   var y := floor_index*3.2+1.8
   for col in range(columns):
    var x := -width/2+(col+0.5)*width/columns
    if floor_index==0 and col==columns/2:
     Parts.box(st,Vector3(x,1.25,z),Vector3(1.35,2.5,0.20),trim)
     Parts.box(st,Vector3(x,1.20,z+side*0.11),Vector3(1.08,2.3,0.025),Color("3d4944"))
     Parts.box(st,Vector3(x,2.65,z+side*0.55),Vector3(1.8,0.13,1.2),Color("3f5756"))
     continue
    var win_w := 1.35 if kind!="shop" or floor_index>0 else 2.05
    var win_h := 1.6 if kind!="shop" or floor_index>0 else 2.05
    Parts.box(st,Vector3(x,y,z),Vector3(win_w+0.22,win_h+0.22,0.22),trim)
    Parts.box(st,Vector3(x,y,z+side*0.115),Vector3(win_w,win_h,0.025),glass)
    Parts.box(st,Vector3(x,y,z+side*0.15),Vector3(0.055,win_h,0.08),trim)
    Parts.box(st,Vector3(x,y-win_h/2-0.08,z+side*0.13),Vector3(win_w+0.35,0.13,0.42),trim)
    if kind=="apartments" and floor_index>0 and col%2==0:
     Parts.box(st,Vector3(x,y-1.0,z+side*0.6),Vector3(2.2,0.16,1.3),Color("99998c"))
     Parts.box(st,Vector3(x,y-0.55,z+side*1.23),Vector3(2.2,0.85,0.08),Color("66746c"))
   Parts.box(st,Vector3(0,(floor_index+1)*3.2-0.10,z),Vector3(width+0.15,0.18,0.20),trim)
 # End walls: fewer windows, not a continuous wallpaper grid.
 for side in [-1.0,1.0]:
  for floor_index in range(floors):
   for z in [-depth*0.25,depth*0.25]:
    Parts.box(st,Vector3(side*(width/2+0.07),floor_index*3.2+1.8,z),Vector3(0.16,1.8,1.35),trim)
    Parts.box(st,Vector3(side*(width/2+0.16),floor_index*3.2+1.8,z),Vector3(0.025,1.55,1.1),glass)
 if kind=="apartments":
  Parts.box(st,Vector3(0,height+0.12,0),Vector3(width+0.25,0.24,depth+0.25),Color("535953"))
  Parts.box(st,Vector3(0,height+0.7,0),Vector3(2.6,1.1,2.1),tint.darkened(0.15))
 else:
  var g := Geometry.new()
  var roof := Color("555b5b") if kind=="wood" else Color("855847")
  var a := Vector3(-width/2-0.35,height,-depth/2-0.35)
  var b := Vector3(width/2+0.35,height,-depth/2-0.35)
  var c := Vector3(width/2+0.35,height,depth/2+0.35)
  var d := Vector3(-width/2-0.35,height,depth/2+0.35)
  var r1 := Vector3(a.x,height+depth*0.32,0)
  var r2 := Vector3(b.x,r1.y,0)
  g.quad(st,a,b,r2,r1,roof,Vector3(0,1,-0.64).normalized())
  g.quad(st,d,r1,r2,c,roof.lightened(0.06),Vector3(0,1,0.64).normalized())
  g.triangle(st,a,r1,d,tint,Vector3.LEFT)
  g.triangle(st,b,c,r2,tint,Vector3.RIGHT)
  Parts.box(st,Vector3(width*0.26,r1.y-0.25,depth*0.12),Vector3(0.7,1.9,0.8),Color("855e50"))
 st.index()
 return st.commit()
