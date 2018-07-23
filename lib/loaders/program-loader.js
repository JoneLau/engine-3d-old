import resl from '../misc/resl';

function glslStripComment(code) {
  // block comments don't matter here because
  // the actual compiler will handle them correctly
  return code.replace(/\/\/.*/g, '');
}

function unwindIncludes(str, chunks) {
  let pattern = /#include +<([\w\d\-_.]+)>/gm;
  function replace(match, include) {
    let replace = chunks[include];
    if (replace === undefined) {
      console.error(`can not resolve #include <${include}>`);
    }
    return unwindIncludes(replace);
  }
  return str.replace(pattern, replace);
}

function buildTemplates(json, vert, frag, chunks) {
  vert = unwindIncludes(glslStripComment(vert), chunks);
  frag = unwindIncludes(glslStripComment(frag), chunks);

  let defines = [];
  for (let def in json) {
    let define = { name: def };
    if (json[def] && json[def].min !== undefined) {
      define.min = json[def].min;
    }
    if (json[def] && json[def].max !== undefined) {
      define.max = json[def].max;
    }
    defines.push(define);
  }
  return { vert, frag, defines };
}

export default function (app, urls) {
  resl({
    manifest: {
      json: {
        type: 'text',
        parser: JSON.parse,
        src: urls.json,
      },
      vert: {
        type: 'text',
        src: urls.vert
      },
      frag: {
        type: 'text',
        src: urls.frag
      }
    },

    onDone(data) {
      const { json, vert, frag } = data;
      let template = buildTemplates(json, vert, frag, app._forward._programLib._chunks);
      app._forward._programLib.define(urls.name, template.vert, template.frag, template.defines);
    }
  });
}
