// load level
function load(baseUrl, sceneName, onLevelLoaded) {
  cc.resl({
    manifest: {
      gameInfo: {
        type: 'text',
        parser: JSON.parse,
        src: `${baseUrl}/game.json`
      }
    },

    onDone(data) {
      app.loadGameConfig(baseUrl, data.gameInfo);
      app.assets.loadLevel(sceneName, (err, level) => {
        if (err) {
          console.error(err);
        } else {
          app.loadLevel(level);
          if (onLevelLoaded) {
            onLevelLoaded();
          }
        }
      });
    }
  });
}