extends Node3D
const MAX_CARS := 64
const MAX_PEOPLE := 128
const Geometry = preload("res://scripts/city_geometry.gd")
var quality := "models"
var lights_enabled := true
var flashes_enabled := true
var vehicle_lights = preload("res://scripts/vehicle_lighting.gd").new()
var skins = preload("res://scripts/vehicle_skin.gd").new()
var humans = preload("res://scripts/human_skin.gd").new()
var walk_state: Dictionary = {}
var models: Dictionary
var shared: Dictionary = {}
var cars: Array[MeshInstance3D] = []
var people: Array[MeshInstance3D] = []
var materials: Dictionary = {}
func set_quality(value: String) -> void:
 quality = value
 for actor in cars+people:
  actor.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if quality=="models" else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
func model(kind: String) -> Mesh:
 if quality=="simple":
  var key := "simple-"+kind
  if not shared.has(key):
   var box := BoxMesh.new()
   box.size = Vector3(0.5,1.7,0.5) if kind in ["civilian","officer"] else (Vector3(10.5,3.0,2.4) if kind=="bus" else Vector3(4.2,1.5,1.8))
   shared[key] = box
  return shared[key]
 if shared.has(kind):
  return shared[kind]
 if kind=="bus":
  shared[kind] = preload("res://scripts/bus_model.gd").build()
  return shared[kind]
 if kind in ["ambulance","rescue"]:
  shared[kind] = preload("res://scripts/service_models.gd").build(model("suv"),kind)
  return shared[kind]
 var data: Dictionary = models[kind]
 var builder := SurfaceTool.new()
 builder.begin(Mesh.PRIMITIVE_TRIANGLES)
 var geometry = Geometry.new()
 var palette := {"paint":"#d0d9de","trim":"#414b53","plate":"#f2f3e9","glass":"#274855","seal":"#273039","metal":"#89949a","stripe":"#295696","tire":"#252a2d","headlight":"#fff1bd","taillight":"#b73734","rubber":"#273039","beaconA":"#397fe6","beaconB":"#4385f1","skin":"#d2aa8d","uniform":"#28435c","cloth":"#8d786e","pants":"#3a4654","shoe":"#252a2d","hair":"#44372f"}
 for face in data.faces:
  if kind in ["sedan","suv"] and face.get("group","") in ["police","aid","search"]:
   continue
  var vertices: Array[Vector3] = []
  for index in face.v:
   var p = data.vertices[index]
   vertices.append(Vector3(p[0],p[2],p[1]))
  if vertices.size()<3:
   continue
  var normal := -(vertices[1]-vertices[0]).cross(vertices[2]-vertices[0]).normalized()
  for index in range(1,vertices.size()-1):
   geometry.triangle(builder,vertices[0],vertices[index],vertices[index+1],Color(palette.get(face.material,"#777e87")),normal)
 builder.index()
 shared[kind] = builder.commit()
 return shared[kind]
# Claude 15.10: the service vehicles of Claude's F–J (fire engines, ambulances) use the original game's models.
const SERVICE_MODELS := {"engine":"engine","ladder":"ladder","tanker":"tanker","ambulance":"ambulance-van","resus":"resus","suv":"suv","rapid":"suv"}
static func vehicle_model_of(vehicle_type: String) -> String:
 return SERVICE_MODELS.get(vehicle_type,"sedan")
func _ready() -> void:
 add_child(vehicle_lights)
 models = JSON.parse_string(FileAccess.get_file_as_string("res://assets/actor-models.json"))
 for kind in ["police","civilian","ambulance","rescue"]:
  var material := StandardMaterial3D.new()
  material.vertex_color_use_as_albedo = true
  material.roughness = 0.7
  material.albedo_color = Color.WHITE
  materials[kind] = material
 for index in range(MAX_CARS):
  var actor := MeshInstance3D.new()
  actor.mesh = model("sedan")
  actor.visible = false
  add_child(actor)
  cars.append(actor)
 for index in range(MAX_PEOPLE):
  var actor := MeshInstance3D.new()
  actor.mesh = model("civilian")
  actor.visible = false
  actor.material_override = materials.civilian
  add_child(actor)
  people.append(actor)
func world(p: Dictionary) -> Vector3:
 var point := Vector3((float(p.get("x",1.55))-1.55)*1670,0.12,(float(p.get("y",2.52))-2.52)*1670)
 point.y += preload("res://scripts/road_elevation.gd").height_at(point,float(p.get("heading",p.get("renderHeading",INF))))
 return point
func show_person(actor: MeshInstance3D,person: Dictionary,kind: String,key: String,position: Vector3,detail: bool) -> void:
 var previous: Dictionary = walk_state.get(key,{"position":position,"phase":0.0})
 var travelled: float = position.distance_to(previous.position)
 var walking: bool = person.get("walking",false)
 var phase: float = float(previous.phase)
 if walking and travelled<5:
  phase = fmod(phase+travelled*5.0,TAU)
 elif not walking:
  phase = 0.0
 walk_state[key] = {"position":position,"phase":phase}
 actor.material_override = materials.civilian
 if quality!="simple" and not person.get("nativeStyle",{}).is_empty():
  humans.apply(actor,models[kind],kind,person.nativeStyle,str(person.get("pose","idle")),sin(phase) if walking else 0.0,detail,quality=="models")
 else:
  humans.hide_parts(actor)
  actor.mesh = model(kind)
 actor.position = position
 actor.rotation.y = -float(person.get("heading",0))
 actor.visible = true
func refresh(view: Dictionary,selected: int,focus: Vector3,distance: float) -> void:
 var car_count := 0
 var person_count := 0
 var radius := maxf(120,distance*1.6)
 var poses: Array = []
 var active_people: Dictionary = {}
 var light_sources: Array = []
 var detail: bool = distance<160.0
 for unit in view.get("units",[]):
  if int(unit.id)!=selected:
   var vehicle_model := "sedan"
   var style: Dictionary = {}
   for vehicle in view.get("vehicles",[]):
    if vehicle.id==unit.get("vehicleId"):
     vehicle_model = vehicle_model_of(str(vehicle.get("type","sedan")))
     style = vehicle.get("nativeStyle",{})
   poses.append({"pose":unit,"kind":"police","model":vehicle_model,"style":style})
  var crew_index := 0
  for person in unit.get("crew",[]):
   crew_index += 1
   if person_count>=MAX_PEOPLE:
    break
   var position: Vector3 = world(person)
   if position.distance_to(focus)>radius:
    continue
   var actor := people[person_count]
   var key := "crew-"+str(unit.id)+"-"+str(crew_index)
   active_people[key] = true
   show_person(actor,person,"officer",key,position,detail)
   person_count += 1
 for incident in view.get("incidents",[]):
  if incident.get("state") in ["resolved","missed"]:
   continue
  var participant_index := 0
  for participant in incident.get("participants",[]):
   participant_index += 1
   if incident.get("type")==5:
    poses.append({"pose":participant,"kind":"civilian","model":"sedan"})
   elif person_count<MAX_PEOPLE:
    var position: Vector3 = world(participant)
    if position.distance_to(focus)>radius:
     continue
    var actor := people[person_count]
    var key := "participant-"+str(incident.id)+"-"+str(participant.get("id",participant_index))
    active_people[key] = true
    show_person(actor,participant,"civilian",key,position,detail)
    person_count += 1
 for service in view.get("services",[]):
  # Claude 16.10 (Release K): a city patrol at a joint scene is a police sedan in the police livery.
  # Claude 17.10 (Release R1): the shift supervisor drives a police sedan.
  if service.get("kind") in ["police","lead"]:
   poses.append({"pose":service,"kind":"police","model":"sedan","style":service.get("nativeStyle",{})})
   continue
  # Claude 16.10 (Release M): the prefecture's rapid response team and K-Komando are dark police SUVs.
  if service.get("kind") in ["gbr","kk"]:
   poses.append({"pose":service,"kind":"police","model":"suv","style":service.get("nativeStyle",{})})
   continue
  poses.append({"pose":service,"kind":service.get("kind","ambulance"),"model":service.get("kind","ambulance")})
 for resident in view.get("residents",[]):
  if resident.get("status") in ["home","work"]:
   continue
  if resident.get("status") in ["toHome","toWork","toVisit","fromVisit"]:
   poses.append({"pose":resident,"kind":"civilian","model":"sedan","style":resident.get("vehicleStyle",{})})
  elif person_count<MAX_PEOPLE:
   var position: Vector3 = world(resident)
   if position.distance_to(focus)>radius:
    continue
   var actor := people[person_count]
   var key := "resident-"+str(resident.id)
   active_people[key] = true
   show_person(actor,resident,"civilian",key,position,detail)
   person_count += 1
 # Claude 17.10 (Release O3 «Живой город»): people of the city on their way — on foot or in their own car.
 for citizen in view.get("citizens",[]):
  if citizen.get("car",false):
   poses.append({"pose":citizen,"kind":"civilian","model":"sedan","style":citizen.get("vehicleStyle",{})})
  elif person_count<MAX_PEOPLE:
   var position: Vector3 = world(citizen)
   if position.distance_to(focus)>radius:
    continue
   var actor := people[person_count]
   var key := "citizen-"+str(citizen.id)
   active_people[key] = true
   citizen["walking"] = true
   show_person(actor,citizen,"civilian",key,position,detail)
   person_count += 1
 # W1: scheduled ambient vehicles have lower priority than emergency crews.
 for vehicle in view.get("traffic",[]):
  poses.append({"pose":vehicle,"kind":"civilian","model":"bus" if vehicle.get("bus",false) else "sedan"})
 for item in poses:
  if car_count>=MAX_CARS:
   break
  var position: Vector3 = world(item.pose)
  if str(item.pose.get("id","")).begins_with("traffic-") or str(item.pose.get("id","")).begins_with("bus-"):
   var heading := float(item.pose.get("heading",0.0))
   position += Vector3(-sin(heading),0,cos(heading))*1.35
  if position.distance_to(focus)>radius:
   continue
  var car := cars[car_count]
  car.material_override = materials.get(item.kind,materials.police)
  if item.kind in ["police","civilian"] and quality!="simple" and not item.get("style",{}).is_empty():
   skins.apply(car,models[item.model],item.model,item.style,item.pose.get("doors",{}),lights_enabled and flashes_enabled and bool(item.pose.get("emergency",false)),fmod(Time.get_ticks_msec()/1000.0,1.0)<0.5,quality=="models")
  else:
   skins.hide_doors(car)
   car.mesh = model(item.model)
  car.position = position
  car.rotation.y = -float(item.pose.get("heading",item.pose.get("renderHeading",0)))
  if not item.pose.has("heading") and not item.pose.has("renderHeading") and typeof(item.pose.get("target"))==TYPE_DICTIONARY:
   var direction: Vector3 = world(item.pose.target)-position
   if direction.length()>0.01:
    car.rotation.y = -atan2(direction.z,direction.x)
  car.visible = true
  var emergency: bool = bool(item.pose.get("emergency",false)) if item.kind=="police" else (item.kind in ["ambulance","rescue"] and item.pose.get("status")=="responding")
  light_sources.append({"transform":car.transform,"kind":item.kind,"model":item.model,"style":item.get("style",{}),"emergency":emergency and flashes_enabled})
  car_count += 1
 for index in range(car_count,MAX_CARS):
  cars[index].visible = false
 for index in range(person_count,MAX_PEOPLE):
  people[index].visible = false

 for key in walk_state.keys():
  if not active_people.has(key):
   walk_state.erase(key)

 vehicle_lights.refresh(light_sources,view.get("lighting",{}),focus,distance,lights_enabled,quality)
