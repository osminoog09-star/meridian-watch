extends SceneTree
# Claude 22.10 (City 2.0 «Вывески»): every named non-service building of the plan has a sign entry over its roof.
func _initialize() -> void:
 var signs = JSON.parse_string(FileAccess.get_file_as_string("res://assets/signs.json"))
 var names := {}
 var ok: bool = signs is Array and signs.size()>=10
 for s in signs:
  names[str(s.name)] = true
  ok = ok and str(s.name).length()>2 and float(s.top)>2.0 and absf(float(s.x))<3000.0 and absf(float(s.z))<3000.0
 for need in ["Железнодорожный вокзал","Автовокзал","Ратуша","Школа","Рынок"]:
  ok = ok and names.has(need)
 print("Civic signs: ",signs.size()," ","PASS" if ok else "FAILED")
 quit(0 if ok else 1)
