import { Level } from 'ecs.js';
import ecsUtils from './ecs-utils';

export default function (app, json, callback) {
  ecsUtils.preloadAssets(app, json, () => {
    let entInfos = json.entities;
    let entities = new Array(json.entities.length);

    // create entities and prefabs
    for (let i = 0; i < entInfos.length; ++i) {
      let entInfo = entInfos[i];
      if (entInfo.prefab) {
        let prefab = app.assets.get(entInfo.prefab);
        if (!prefab) {
          console.error(`Failed to load prefab ${entInfo.prefab}`);
          continue;
        }

        entities[i] = prefab.instantiate(entInfo.modifications);
      } else {
        entities[i] = ecsUtils.createEntity(app, entInfo);
      }

      console.log(`${entInfo.name} loaded`);
    }

    // finalize entities
    ecsUtils.finalize(app, entities, json.entities);

    // add them to level
    let level = new Level();
    for (let i = 0; i < json.children.length; ++i) {
      let idx = json.children[i];
      level.append(entities[idx]);
    }

    if (callback) {
      callback(null, level);
    }
  });
}