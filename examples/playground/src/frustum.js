(() => {
  const { cc, app, dgui } = window;
  const { vec3, color3, color4, quat, mat3, toRadian } = cc.math;

  // controllers
  let dobj = {
    accurateFrustumCulling: true
  };

  // manifest
  let manifest = {};
  manifest.materials = {
    num: 2,
    names: [
      "builtin-effect-phong", 
      "builtin-effect-phong-transparent", 
    ],
    properties: [
      {}, 
      { "diffuseColor": color4.new(1, 1, 1, 0.3) },
    ]
  };
  manifest.lights = {
    num:2,
    names: [
      "point-light1",
      "point-light2",
    ],
    pos: [
      vec3.new(100, 100, 50),
      vec3.new(-100, 100, -50),
    ],
    color: [
      color3.new(1, 1, 1),
      color3.new(0.3, 0.3, 0.3),
    ],
  };
  manifest.geometries = {
    num: 5,
    names: [
      "frustum",
      "sphere",
      "box",
      "sphere-false-positive",
      "box-false-positive",
    ],
    meshes: [
      cc.primitives.box(2, 2, 2, { invWinding: true }),
      cc.primitives.sphere(),
      cc.primitives.box(),
      cc.primitives.sphere(30),
      cc.primitives.box(30, 50, 30),
    ],
    pos: [
      vec3.new(0, 0, 0),
      vec3.new(7, 2, 5),
      vec3.new(1, 2, 3),
      vec3.new(-90, 20, -135),
      vec3.new(160, 20, -80),
    ],
    axis: [
      vec3.new(0, 1, 0),
      vec3.new(2, 2, 2),
      vec3.new(3, 2, 1),
      vec3.new(2, 2, 2),
      vec3.new(1, 2, 3),
    ],
    angle: [
      0, Math.PI / 16, Math.PI / 16 * 13, -Math.PI / 16, -Math.PI / 16 * 13,
    ],
    active: [
      true, true, true, true, true
    ]
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
    g.material = materials[0]; e.lpos = manifest.geometries.pos[i];
    g.material_bak = g.material; e.active = manifest.geometries.active[i];
    let axis = manifest.geometries.axis[i];
    let angle = manifest.geometries.angle[i];
    quat.fromAxisAngle(e.lrot, vec3.normalize(axis, axis), angle);
    geometries.push(e);
  }

  // camera
  let camera = app.createEntity('camera');
  vec3.set(camera.lpos, 4, 5, 6);
  let cam = camera.addComp('Camera');
  let view = new cc.renderer.View();
  cam.near = 0.5; cam.far = 100; cam.fov = 60;
  // debugging camera should have the same fov,
  // but a much longer visible range (0.01-1000)
  app._debugger._camera.setFov(toRadian(cam.fov));


  // TWEAK: look at point
  camera.lookAt(vec3.new(5, 4, 3));
  app._forward.accurateFrustumCulling = dobj.accurateFrustumCulling;

  // adjust canvas ratio
  let h = app._device._gl.canvas.width / 16 * 9;
  if (app._device._gl.canvas.height > h) app._device._gl.canvas.height = h;
  else app._device._gl.canvas.width = app._device._gl.canvas.height / 9 * 16;
  let w = app._device._gl.canvas.width; h = app._device._gl.canvas.height;

  // warp the frustum boundary hint
  let mulPos = (function() {
    return function(m, a, i) {
      let x = a[i], y = a[i+1], z = a[i+2],
          rhw = 1 / (m.m03 * x + m.m07 * y + m.m11 * z + m.m15);
      a[ i ] = (m.m00 * x + m.m04 * y + m.m08 * z + m.m12) * rhw;
      a[i+1] = (m.m01 * x + m.m05 * y + m.m09 * z + m.m13) * rhw;
      a[i+2] = (m.m02 * x + m.m06 * y + m.m10 * z + m.m14) * rhw;
    };
  })();
  let mulNorm = (function() {
    let m = mat3.create();
    return function(om, a, i) {
      mat3.normalFromMat4(m, om);
      let x = a[i], y = a[i+1], z = a[i+2];
      a[ i ] = x * m.m00 + y * m.m03 + z * m.m06;
      a[i+1] = x * m.m01 + y * m.m04 + z * m.m07;
      a[i+2] = x * m.m02 + y * m.m05 + z * m.m08;
    };
  })();
  cam._camera.extractView(view, w, h);
  let frustum = geometries[0].getComp('Model');
  let mesh = manifest.geometries.meshes[0];
  for (let i = 0; i < mesh.positions.length; i += 3) {
    mulPos(view._matInvViewProj, mesh.positions, i);
    mulNorm(view._matInvViewProj, mesh.normals, i);
  }
  frustum.mesh = cc.utils.createMesh(app, manifest.geometries.meshes[0]);
  frustum.material = materials[1]; // transparent material
  frustum._models[0]._boundingBox = null; // disable frustum culling for this

  // debug controller
  dgui.remember(dobj);
  dgui.add(dobj, 'accurateFrustumCulling').onFinishChange(() => {
    app._forward.accurateFrustumCulling = dobj.accurateFrustumCulling;
  });
  // monkey patch the extraction function to show exactly
  // which model has been submitted to the pipeline
  let submitted = {};
  for (let i = 1; i < geometries.length; i++) {
    let models = geometries[i].getComp('Model')._models;
    models[0].extractDrawItemOld = models[0].extractDrawItem;
    models[0].extractDrawItem = function(out) {
      submitted[models[0]._node.name] = true;
      models[0].extractDrawItemOld(out);
    };
  }
  // on-screen text
  let screen = app.createEntity('screen');
  screen.addComp('Screen');
  let entWidget = app.createEntity('widget');
  entWidget.setParent(screen);
  let widget = entWidget.addComp('Widget');
  widget.setSize(w, h);
  let entLabel = app.createEntity('label');
  entLabel.setParent(entWidget);
  let text = entLabel.addComp('Text');
  text.setSize(w, h);
  text.text = '';
  text.align = 'middle-center';
  text.color = color4.new(1, 0.7, 0, 1);
  text.fontSize = 14;
  // sync the result to screen every frame
  app.on('tick', () => {
    text.text = "Drawing models:\n";
    for (let m in submitted) text.text += m + "\n";
    submitted = {};
  });

})();
