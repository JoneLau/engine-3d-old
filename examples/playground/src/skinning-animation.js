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
        gameInfo: {
          type: 'text',
          parser: JSON.parse,
          src: `${dobj.baseUrl}/game.json`
        }
      },

      onDone(data) {
        app.loadGameConfig(`${dobj.baseUrl}`, data.gameInfo);
        app.assets.loadLevel(`${dobj.scene}`, (err, level) => {
          if (err) {
            console.error(err);
          } else {
            app.loadLevel(level);
          }
        });

      }
    });
  }

  function play() {
    let ent = app.find(dobj.entityPath);
    let anim = ent.getComp('Animation');
    anim.play(dobj.animName);
  }
})();
