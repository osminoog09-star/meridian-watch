extends SceneTree
func _initialize() -> void:
 var mesh = preload("res://scripts/bus_model.gd").build()
 assert(mesh.get_surface_count()==1)
 assert(mesh.get_aabb().size.x>10.0)
 assert(mesh.get_aabb().size.z>2.3)
 print("W1 bus shared mesh PASS")
 quit()
