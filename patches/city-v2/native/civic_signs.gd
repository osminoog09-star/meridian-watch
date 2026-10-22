extends Node3D
# Claude 22.10.2026 (City 2.0 «Вывески»). The named buildings of the town — railway station, bus station, town hall,
# museum, schools, church, market, shopping centre, works — carry a sign over the roof, coloured by what they are.
# Signs show only near the camera (no clutter in the city view, where the service masts of landmarks.gd speak); the
# services themselves (police, hospital, ambulance, fire, ГБР) keep their masts. Data: assets/signs.json (the plan).
const COLORS := {"train_station":"3b6fb0","bus_station":"2f8f8a","civic":"8a6a3a","museum":"7a4f8a","school":"c27b25","church":"6a5a4a","retail":"b5452f","commercial":"9a3a5a","industrial":"5d666b"}
const NEAR := 600.0
var count := 0
func _ready() -> void:
 if DisplayServer.get_name()=="headless" or not FileAccess.file_exists("res://assets/signs.json"):
  return
 for s in JSON.parse_string(FileAccess.get_file_as_string("res://assets/signs.json")):
  var label := Label3D.new()
  label.name = "Sign_"+str(count)
  label.text = str(s.name)
  label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
  label.fixed_size = true
  label.pixel_size = 0.0015
  label.font_size = 30
  label.outline_size = 9
  label.modulate = Color("ffffff")
  label.outline_modulate = Color(COLORS.get(str(s.kind),"4a5560"))
  label.position = Vector3(float(s.x),float(s.top)+3.0,float(s.z))
  label.no_depth_test = true
  label.visibility_range_end = NEAR
  label.render_priority = 1
  add_child(label)
  count += 1
