(() => {
  const { cc, app, dgui } = window;
  const { resl, path } = cc;

  let dobj = {
    baseUrl: '../assets/out',
    scene: 'spec-skeleton',
    entityPath: 'skeleton',
    animName: 'Idle',
    load: load,
    play: play,
  };

  dgui.remember(dobj);
  dgui.add(dobj, 'baseUrl').onFinishChange(() => {
    load();
  });
  dgui.add(dobj, 'scene').onFinishChange(() => {
    load();
  });
  dgui.add(dobj, 'entityPath');
  dgui.add(dobj, 'animName').onFinishChange(() => {
    play();
  });
  dgui.add(dobj, 'load');
  dgui.add(dobj, 'play');

  load();

  function load() {
    resl({
      manifest: {
        assetInfos: {
          type: 'text',
          parser: JSON.parse,
          src: `${dobj.baseUrl}/assets.json`
        },

        scene: {
          type: 'text',
          parser: JSON.parse,
          src: `${dobj.baseUrl}/${dobj.scene}.json`
        },
      },

      onDone(data) {
        const sceneJson = data.scene;
        const assetInfos = data.assetInfos;

        for (let uuid in assetInfos) {
          let info = assetInfos[uuid];
          for (let item in info.urls) {
            info.urls[item] = path.join(dobj.baseUrl, info.urls[item]);
          }

          app.assets.registerAsset(uuid, info);
        }

        cc.utils.parseLevel(
          app,
          sceneJson,
          (err, level) => {
            app.loadLevel(level);
          }
        );
      }
    });
  }

  function play() {
    let ent = app.find(dobj.entityPath);
    let anim = ent.getComp('Animation');
    anim.play(dobj.animName);
  }
})();
