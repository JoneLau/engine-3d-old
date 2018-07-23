(() => {
  const { cc, app, dgui } = window;
  const { resl, Texture2D, Material } = cc;
  const { vec3, color3, color4, quat, clamp } = cc.math;
  const { sphere } = cc.primitives;

  /**
   * note: 
   * this is the baseline test scene for PBR materials, compared to
   * the identical scene from [LearnOpenGL](https://learnopengl.com).
   * There are a few minor but irreconcilable details:
   * * lighting result, specifically the result of `NdotH` part is a bit different,
   *   but it's an issue within the native version, our results are correct
   * * slightly texture banding, unavoidable unless we use true HDR format texture
   *   and generate everything on the fly, but already barely visible anyway
   */

  // configs
  let dobj = {
    useIBL: true,
    useTexLod: true,
    maxRefLod: 7,
    envURL: '../assets/pbr/ibl/loft',
    albedo: '',
    normal: '',
    ao: '',
    metallic: '',
    roughness: '',
  };

  // lights
  let lightPos = [
    vec3.new( 10,  10, 10),
    vec3.new(-10,  10, 10),
    vec3.new( 10, -10, 10),
    vec3.new(-10, -10, 10),
  ];
  for (let i = 0; i < 4; i++) {
    let lightEnt = app.createEntity('point-light');
    vec3.set(lightEnt.lpos, lightPos[i].x, lightPos[i].y, lightPos[i].z);
    let light = lightEnt.addComp('Light');
    light.type = 'point';
    light.color = color3.new(1, 1, 1);
    light.intensity = 2;
    light.range = 1000;
  }
  
  // geometries
  let rows = 7, cols = 7, spacing = 2.5;
  let entities = [];
  let meshSphere = cc.utils.createMesh(app, sphere(1, {
    segments: 64,
  }));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      let m = new Material();
      m.effect = app.assets.get('builtin-effect-pbr');
      m.setProperty('ao', 1.0);
      m.setProperty('albedo', color4.new(0.5, 0, 0, 1));
      m.setProperty('metallic', i/rows);
      m.setProperty('roughness', clamp(j/cols, 0.05, 1));
      m.define("USE_RGBE_HDR_IBL_DIFFUSE", true);
      m.define("USE_RGBE_HDR_IBL_SPECULAR", true);

      let ent = app.createEntity('sphere'+i);
      let modelComp = ent.addComp('Model');
      modelComp.mesh = meshSphere;
      modelComp.material = m;
      vec3.set(ent.lpos, (j-cols/2)*spacing, (i-rows/2)*spacing, -2);
      entities.push(ent);
    }
  }

  // camera
  let camEnt = app.createEntity('camera');
  vec3.set(camEnt.lpos, -15, 10, 12);
  quat.fromEuler(camEnt.lrot, -27, 38-90, 0);
  let camComp = camEnt.addComp('Camera');
  camComp.clearFlags |= cc.renderer.CLEAR_SKYBOX;
  // app._device._gl.canvas.width = 1280; app._device._gl.canvas.height = 720;

  // util functions
  let setProperty = function(name, prop) {
    for (let i = 0; i < rows*cols; i++)
      entities[i].getComp('Model').material.setProperty(name, prop);
  };
  let define = function(name, def) {
    for (let i = 0; i < rows*cols; i++)
      entities[i].getComp('Model').material.define(name, def);
  };
  let loadTexture = (function() {
    let cb = function(texture, prop) {
      if (texture) {
        define('USE_'+prop.toUpperCase(), true);
        setProperty(prop, texture);
      } else {
        define('USE_'+prop.toUpperCase(), false);
      }
    };
    return function (url, prop) {
      if (!url) {
        cb(null, prop);
        return;
      }

      resl({
        manifest: {
          image: {
            type: 'image',
            src: url,
          },
        },
        onDone(assets) {
          let texture = new Texture2D(app.device);
          texture.setImage(0, assets.image);
          texture.wrapS = 'clamp';
          texture.wrapT = 'clamp';
          texture.mipmap = true;
          texture.commit();

          cb(texture, prop);
        }
      });
    };
  })();
  let activateSkyBox = function(model) {
    if (model) {
      camComp.clearFlags |= cc.renderer.CLEAR_SKYBOX;
    } else {
      camComp.clearFlags &= ~cc.renderer.CLEAR_SKYBOX;
    }
    app._debugger._camera._clearFlags = camComp.clearFlags;
    app._debugger._camera._clearModel = model;
  };
  let loadIBL = function(useIBL) {
    define("USE_IBL", dobj.useIBL);
    if (!useIBL) {
      activateSkyBox(null);
      return;
    }
    // lightSwitch(false);

    // load environment box.
    let envSrc = `${dobj.envURL}/environment`;
    // front, back, top, bottom, right, left
    const envUrls = {
      json: `${envSrc}/environment.json`,
      imagePosX: `${envSrc}/environment_0.hdr.png`,
      imageNegX: `${envSrc}/environment_1.hdr.png`,
      imagePosY: `${envSrc}/environment_2.hdr.png`,
      imageNegY: `${envSrc}/environment_3.hdr.png`,
      imagePosZ: `${envSrc}/environment_4.hdr.png`,
      imageNegZ: `${envSrc}/environment_5.hdr.png`,
    };
    app.assets.loadUrls('texture', envUrls, (err, cubeMap) => {
      let skyboxComp = camEnt.getComp('Skybox');
      if (!skyboxComp) {
        skyboxComp = camEnt.addComp('Skybox');
        let skyboxMaterial = new Material();
        skyboxMaterial.effect = app.assets.get('builtin-effect-skybox');
        skyboxMaterial.define("USE_RGBE_HDR", true);
        skyboxComp.material = skyboxMaterial;
      }
      skyboxComp.material.setProperty('cubeMap', cubeMap);
      activateSkyBox(skyboxComp._model);
    });

    // load indirect lighting resource
    let diffuseSrc = `${dobj.envURL}/diffuse`;
    const difUrls = {
      json: `${diffuseSrc}/diffuse.json`,
      imagePosX: `${diffuseSrc}/diffuse_0.hdr.png`,
      imageNegX: `${diffuseSrc}/diffuse_1.hdr.png`,
      imagePosY: `${diffuseSrc}/diffuse_2.hdr.png`,
      imageNegY: `${diffuseSrc}/diffuse_3.hdr.png`,
      imagePosZ: `${diffuseSrc}/diffuse_4.hdr.png`,
      imageNegZ: `${diffuseSrc}/diffuse_5.hdr.png`,
    };
    app.assets.loadUrls('texture', difUrls, (err, cubeMap) => {
      setProperty('diffuseEnvTexture', cubeMap);
    });

    let specularSrc = `${dobj.envURL}/specular`;
    let specUrls = {
      json: `${specularSrc}/specular.json`,
    };
    for(let i = 0; i < 8; ++i) {
      let suffix = i === 0 ? '' : `@${i}`;
      specUrls[`imagePosX${suffix}`] = `${specularSrc}/specular_${i}_0.hdr.png`;
      specUrls[`imageNegX${suffix}`] = `${specularSrc}/specular_${i}_1.hdr.png`;
      specUrls[`imagePosY${suffix}`] = `${specularSrc}/specular_${i}_2.hdr.png`;
      specUrls[`imageNegY${suffix}`] = `${specularSrc}/specular_${i}_3.hdr.png`;
      specUrls[`imagePosZ${suffix}`] = `${specularSrc}/specular_${i}_4.hdr.png`;
      specUrls[`imageNegZ${suffix}`] = `${specularSrc}/specular_${i}_5.hdr.png`;
    }
    app.assets.loadUrls('texture', specUrls, (err, cubeMap) => {
      setProperty('specularEnvTexture', cubeMap);
    });
  };

  // immediate init
  const lutUrls = {
    json: '../assets/pbr/brdfLUT.json',
    image: '../assets/pbr/brdfLUT.png',
  };
  app.assets.loadUrls('texture', lutUrls, (err, lutMap) => {
    setProperty('brdfLUT', lutMap);
  });
  loadIBL(dobj.useIBL);
  define("USE_TEX_LOD", dobj.useTexLod);
  setProperty("maxReflectionLod", dobj.maxRefLod);
  loadTexture(dobj.albedo, 'albedo_texture');
  loadTexture(dobj.normal, 'normal_texture');
  loadTexture(dobj.metallic, 'metallic_texture');
  loadTexture(dobj.roughness, 'roughness_texture');
  loadTexture(dobj.ao, 'ao_texture');

  // dat.GUI controllers
  dgui.remember(dobj);
  dgui.add(dobj, 'useIBL').onFinishChange(() => {
    loadIBL(dobj.useIBL);
  });
  dgui.add(dobj, 'useTexLod').onFinishChange(() => {
    define("USE_TEX_LOD", dobj.useTexLod);
  });
  dgui.add(dobj, 'maxRefLod').onFinishChange(() => {
    setProperty("maxReflectionLod", dobj.maxRefLod);
  });
  dgui.add(dobj, 'envURL').onFinishChange(() => {
    loadIBL(dobj.useIBL);
  });
  dgui.add(dobj, 'albedo').onFinishChange(() => {
    loadTexture(dobj.albedo, 'albedo_texture');
  });
  dgui.add(dobj, 'normal').onFinishChange(() => {
    loadTexture(dobj.normal, 'normal_texture');
  });
  dgui.add(dobj, 'metallic').onFinishChange(() => {
    loadTexture(dobj.metallic, 'metallic_texture');
  });
  dgui.add(dobj, 'roughness').onFinishChange(() => {
    loadTexture(dobj.roughness, 'roughness_texture');
  });
  dgui.add(dobj, 'ao').onFinishChange(() => {
    loadTexture(dobj.ao, 'ao_texture');
  });

})();