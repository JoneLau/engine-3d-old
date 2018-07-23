(() => {
  const { cc, app } = window;
  const { vec3, color3, color4 } = cc.math;

  // manifest
  let manifest = {};
  manifest.materials = {
    num: 3,
    names: [
      "builtin-effect-phong", 
      "builtin-effect-phong-transparent", 
      "builtin-effect-phong-transparent",
    ],
    properties: [
      {}, 
      { "diffuseColor": color4.new(1, 1, 1, 0.3) },
      { "diffuseColor": color4.new(1, 1, 1, 0.1) },
    ]
  };
  manifest.lights = {
    num:2,
    names: [
      "point-light1",
      "point-light2",
    ],
    pos: [
      vec3.new(10, 10, 5),
      vec3.new(-10, 10, -5),
    ],
    color: [
      color3.new(1, 1, 1),
      color3.new(0.3, 0.3, 0.3),
    ],
  };
  manifest.geometries = {
    num: 6,
    names: [
      "sphere",
      "box",
      "capsule",
      "cylinder",
      "cone",
      "torus",
    ],
    meshes: [
      cc.primitives.sphere(),
      cc.primitives.box(),
      cc.primitives.capsule(),
      cc.primitives.cylinder(),
      cc.primitives.cone(),
      cc.primitives.torus(),
    ],
    pos: [
      vec3.new(0, 0, -1),
      vec3.new(-4, 0, -1),
      vec3.new(-2, 3, 1),
      vec3.new(-2, 0, 4),
      vec3.new(-2, 1, 1),
      vec3.new(-4, -1, 2),
    ],
  };

  // materials
  let materials = [];
  for (let i = 0; i < manifest.materials.num; i++) {
    let m = new cc.Material();
    m.effect = app.assets.get(manifest.materials.names[i]);
    for (let key in manifest.materials.properties[i])
      m.setProperty(key, manifest.materials.properties[i][key]);
    materials.push(m);
  }

  // lights
  let lights = [];
  for (let i = 0; i < manifest.lights.num; i++) {
    let e = app.createEntity(manifest.lights.names[i]);
    e.lpos = manifest.lights.pos[i];
    let l = e.addComp('Light');
    l.type = 'point';
    l.color = manifest.lights.color[i];
    l.intensity = 1.0;
    l.range = 1000.0;
    lights.push(e);
  }

  // geometries
  let geometries = [];
  for (let i = 0; i < manifest.geometries.num; i++) {
    let e = app.createEntity(manifest.geometries.names[i]);
    let g = e.addComp('Model');
    g.mesh = cc.utils.createMesh(app, manifest.geometries.meshes[i]);
    g.material = materials[1]; e.lpos = manifest.geometries.pos[i];
    g.material_bak = g.material;
    geometries.push(e);
  }
  let bbhints = [];
  let bbsize = vec3.zero();
  for (let i = 0; i < manifest.geometries.num; i++) {
    let e = app.createEntity("bb_" + manifest.geometries.names[i]);
    let g = e.addComp('Model');
    vec3.sub(bbsize, geometries[i].getComp('Model').mesh._maxPos, 
      geometries[i].getComp('Model').mesh._minPos);
    g.mesh = cc.utils.createMesh(app, cc.primitives.box(bbsize.x, bbsize.y, bbsize.z));
    g.material = materials[2]; e.lpos = manifest.geometries.pos[i];
    g.material_bak = g.material; e.layer = cc.utils.Layers.IgnoreRaycast;
    bbhints.push(e);
  }

  // camera
  let camera = app.createEntity('camera');
  camera.addComp('Camera');

  class RaycastTest extends cc.ScriptComponent {
    constructor() {
      super();
      this.pos = vec3.zero();
      this.hitInfo = {};
      this.input = app._input;
      this.canvas = app._device._gl.canvas;
      this.camera = camera.getComp('Camera')._camera;
      
      this.center = vec3.new(-2, 1, 1);
      this.dist = 10; this.height = 4; this.angle = 0;
    }

    tick() {
      // move camera
      if (this.dist > 3)
      if (this.input.keypress('w')) this.dist -= 0.1;
      if (this.input.keypress('s')) this.dist += 0.1;
      if (this.input.keypress('a')) this.angle -= 0.02;
      if (this.input.keypress('d')) this.angle += 0.025;
      if (this.input.keypress('q')) this.height -= 0.1;
      if (this.input.keypress('e')) this.height += 0.1;
      if (!this.input.keypress('Shift')) this.angle += 0.005;
      this.updateCamera();

      // reset materials
      for (let i = 0; i < geometries.length; i++) {
        let model = geometries[i].getComp('Model');
        model.material = model.material_bak;
      }

      // get touch pos if there is one
      if (!this.input.mousepress('left') && !this.input.touchCount) return;
      if (this.input.touchCount) {
        let touch = this.input.getTouchInfo(0);
        vec3.set(this.pos, touch.x, touch.y, 1);
      } else vec3.set(this.pos, this.input.mouseX, this.input.mouseY, 1);

      // raycasting
      let ray = this.camera.screenPointToRay(this.pos, this.canvas.width, this.canvas.height);
      if (app.scene.raycast(this.hitInfo, ray)) {
        this.hitInfo.entity.getComp('Model').material = materials[0];
      }
    }

    updateCamera() {
      vec3.set(camera.lpos, this.center.x + Math.sin(this.angle) * this.dist, 
        this.center.y + this.height, 
        this.center.z + Math.cos(this.angle) * this.dist);
      /* optimal */
      let len = this.len(this.height, this.dist);
      let sx = -this.height / len, cx = this.dist / len;
      sx = sx / (1 + cx); cx = Math.sqrt((1 + cx) / 2); sx *= cx; // half angle
      let sy = Math.sin(this.angle * 0.5), cy = Math.cos(this.angle * 0.5);
      camera.lrot.x = sx * cy;
      camera.lrot.y = cx * sy;
      camera.lrot.z = - sx * sy;
      camera.lrot.w = cx * cy;
      /* simple *
      cc.math.quat.fromEuler(camera.lrot, 
        cc.math.toDegree(-Math.atan2(this.height, this.dist)), 
        cc.math.toDegree(this.angle), 0);
      /* horribly redundant *
      camera.lookAt(this.center);
      /**/
    }

    len(x, y) {
      return Math.sqrt(x * x + y * y);
    }
  }
  app.registerClass('RaycastTest', RaycastTest);
  camera.addComp('RaycastTest');

})();
