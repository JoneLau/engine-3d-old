(() => {
  const { cc, app } = window;
  const { Material } = cc;
  const { vec2, vec3, quat, color4 } = cc.math;
  const { plane } = cc.primitives;

  // geometries
  let radius = 5, length = 30;
  let center = vec3.new(0, 1 + radius, -length * radius);
  let quad = cc.utils.createMesh(app, plane(radius * 2, radius * 2));
  let models = [];
  let createQuad = function(num, face, x, y, z, yaw, pitch, roll) {
    let ent = app.createEntity(`quad_${num}_${face}`);
    let modelComp = ent.addComp('Model');
    let m = new Material();
    m.effect = app.assets.get('builtin-effect-unlit');
    modelComp.mesh = quad;
    modelComp.material = m;
    models.push(modelComp);
    vec3.set(ent.lpos, x, y, z);
    quat.fromEuler(ent.lrot, yaw, pitch, roll);
  };
  createQuad(0, 4, center.x, center.y, center.z - radius, 90, 0, 0);
  for (let i = 0; i < length; i++) {
    createQuad(i, 0, center.x, center.y - radius, center.z + i * radius * 2, 0, 0, 0);
    createQuad(i, 1, center.x + radius, center.y, center.z + i * radius * 2, 0, 0, 90);
    createQuad(i, 2, center.x, center.y + radius, center.z + i * radius * 2, 0, 0, 180);
    createQuad(i, 3, center.x - radius, center.y, center.z + i * radius * 2, 0, 0, 270);
  }
  createQuad(length, 5, center.x, center.y, center.z - radius + length * radius * 2, -90, 0, 0);

  // camera
  let camEnt = app.createEntity('camera');
  camEnt.lpos = center;
  quat.fromEuler(camEnt.lrot, 0, 180, 0);
  camEnt.addComp('Camera');

  // util functions
  let setProperty = function(name, prop) {
    for (let i = 0; i < models.length; i++) {
      models[i].material.setProperty(name, prop);
    }
  };

  // init materials
  const programUrls = {
    name: 'binary',
    json: '../assets/materials/binary.json',
    vert: '../assets/materials/binary.vert',
    frag: '../assets/materials/binary.frag',
  };
  app.assets.loadUrls('program', programUrls);
  const effectUrls = { json: '../assets/materials/BinaryEffect.json' };
  app.assets.loadUrls('effect', effectUrls, (err, effect) => {
    for (let i = 0; i < models.length; i++) {
      let m = new Material(); m.effect = effect;
      m.define('USE_COLOR', true);
      models[i].material = m;
    }
  });
  let border = vec2.zero();
  let color = color4.create();
  app.on('tick', () => {
    // uv animation
    let time = app.totalTime * 5;
    let margin = time % (Math.PI * 4) > Math.PI ? 0.1 :
      Math.abs(Math.cos(time)) * 0.1;
    vec2.set(border, margin, margin);
    color4.set(color, 1, margin * 10, margin * 10);
    setProperty('border', border);
    setProperty('color', color);
  });

})();