extends SceneTree
const Country = preload("res://scripts/countryside.gd")
var failed := false
func check(ok: bool,message: String) -> void:
 if not ok:
  failed = true
  push_error(message)
func _initialize() -> void:
 call_deferred("verify")
func verify() -> void:
 var country = Country.new()
 root.add_child(country)
 await process_frame
 var city = JSON.parse_string(FileAccess.get_file_as_string("res://assets/city.json"))
 for exit in Country.CITY_EXITS:
  var linked := false
  for chunk in city.chunks:
   for road in chunk.roads:
    for p in [road.a,road.b]:
     if exit.distance_to(Vector2(p[0],p[1]))<0.001:
      linked = true
  check(linked,"country exit does not meet city road: "+str(exit))
  check(is_equal_approx(country.city_ramp(exit),2.0),"road height must meet city")
  check(is_zero_approx(country.city_ramp(exit+Vector2(121,0))),"ramp must reach country ground")
 var connected := 0
 for road in Country.ROADS:
  if road.points[0] in Country.CITY_EXITS:
   connected += 1
   var line = country.smooth(road.points)
   check(line.size()>1 and line[0].distance_to(road.points[0])<0.001,"country curve must preserve junction")
 check(connected==5,"all five G5 trunk connections retained")
 check(country.get_node("CountryRoads").mesh.get_surface_count()>0,"country mesh built")
 print("City V2 countryside ","FAILED" if failed else "PASSED")
 quit(1 if failed else 0)
