extends SceneTree
# CITY-01 architecture study only; never replaces main.tscn or the campaign map.
const Architecture = preload("res://scripts/design/architecture.gd")
const Parts = preload("res://scripts/service_models.gd")
var world: Node3D
var material: StandardMaterial3D
func add_mesh(mesh: Mesh,at: Vector3) -> void:
 var node := MeshInstance3D.new()
 node.mesh = mesh
 node.material_override = material
 node.position = at
 world.add_child(node)
func _initialize() -> void:
 call_deferred("run")
func run() -> void:
 world = Node3D.new()
 root.add_child(world)
 material = StandardMaterial3D.new()
 material.vertex_color_use_as_albedo = true
 material.roughness = 0.85
 var env := WorldEnvironment.new()
 env.environment = Environment.new()
 env.environment.background_mode = Environment.BG_COLOR
 env.environment.background_color = Color("a6b8c0")
 env.environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
 env.environment.ambient_light_color = Color("b9c9d0")
 env.environment.ambient_light_energy = 0.65
 env.environment.tonemap_mode = Environment.TONE_MAPPER_FILMIC
 world.add_child(env)
 var sun := DirectionalLight3D.new()
 sun.rotation_degrees = Vector3(-48,-32,0)
 sun.light_energy = 1.5
 sun.shadow_enabled = true
 world.add_child(sun)
 var st := SurfaceTool.new()
 st.begin(Mesh.PRIMITIVE_TRIANGLES)
 Parts.box(st,Vector3(0,-0.3,0),Vector3(160,0.5,140),Color("727d62"))
 Parts.box(st,Vector3(0,0,0),Vector3(150,0.1,9),Color("454b4d"))
 for side in [-1.0,1.0]:
  Parts.box(st,Vector3(0,0.11,side*6.1),Vector3(150,0.22,3.2),Color("a6a393"))
 for x in range(-70,71,8):
  Parts.box(st,Vector3(x,0.065,0),Vector3(3,0.02,0.12),Color("ddd7c3"))
 for x in [-49,49]:
  for z in range(-3,4):
   Parts.box(st,Vector3(x,0.07,z),Vector3(2.8,0.02,0.5),Color("ddd7c3"))
 # Courtyard paving behind the apartments, visibly separated from the public street.
 Parts.box(st,Vector3(16,0,-32),Vector3(70,0.08,22),Color("8b8d80"))
 st.index()
 add_mesh(st.commit(),Vector3.ZERO)
 var colors := [Color("c5b698"),Color("b99a82"),Color("a5b0a0"),Color("d3c4a6")]
 for i in range(5):
  add_mesh(Architecture.building(12.5,12,3 if i%2==0 else 2,"shop",colors[i%4]),Vector3(-34+i*14,0,15))
 for i in range(3):
  add_mesh(Architecture.building(19,11,5,"apartments",colors[(i+1)%4]),Vector3(-20+i*24,0,-17))
 for i in range(3):
  add_mesh(Architecture.building(9,9,2,"wood",colors[(i+2)%4]),Vector3(-48+i*19,0,43))
 var bus := preload("res://scripts/bus_model.gd").build()
 add_mesh(bus,Vector3(11,0.05,2))
 var cam := Camera3D.new()
 world.add_child(cam)
 cam.position = Vector3(91,70,100)
 cam.look_at(Vector3(0,5,3))
 cam.fov = 50
 for i in range(12):await process_frame
 var args := OS.get_cmdline_user_args()
 if args.has("--out"):
  await RenderingServer.frame_post_draw
  var file := args[args.find("--out")+1]
  root.get_texture().get_image().save_png(file)
  print("CITY-01 architecture study: ",file)
 quit()
