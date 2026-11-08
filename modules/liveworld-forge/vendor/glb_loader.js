/* Minimal glTF 2.0 / GLB reader for the Nomadic Scene Forge output profile.
 *
 * The game ships three.js r148 alone, with no loader library, and the project
 * rule is that the page loads nothing at runtime. This reader therefore
 * covers exactly the profile the forge emits and refuses anything else
 * instead of half-supporting it:
 *
 *   one embedded buffer, no extensions, no textures, no animations, no skins;
 *   POSITION and NORMAL attributes as float32 VEC3, indices as uint32;
 *   node translation, rotation and scale;
 *   pbrMetallicRoughness with baseColorFactor, metallicFactor, roughnessFactor;
 *   alphaMode OPAQUE, MASK or BLEND and doubleSided.
 *
 * A node's extras.stable_id becomes userData.sightlineId, which is what the
 * Sightline object-ID pass needs to attribute a pixel to a part. The forge
 * writes one per part, so a forged scene can carry an object-ID pass while
 * the live game cannot.
 *
 * Usage: SightlineGlb.parseGlb(arrayBuffer) -> {gltf, group}
 */
(function (global) {
  'use strict';
  var T = global.THREE;
  if (!T) throw new Error('THREE_REQUIRED');

  var COMPONENTS = { 5120: [Int8Array, 1], 5121: [Uint8Array, 1], 5122: [Int16Array, 2],
                     5123: [Uint16Array, 2], 5125: [Uint32Array, 4], 5126: [Float32Array, 4] };
  var TYPE_COUNT = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };

  function fail(message) { throw new Error('GLB_UNSUPPORTED:' + message); }

  function parseGlb(buffer) {
    var view = new DataView(buffer);
    if (buffer.byteLength < 12) fail('TOO_SHORT');
    var magic = view.getUint32(0, true);
    if (magic !== 0x46546C67) fail('MAGIC');
    var version = view.getUint32(4, true);
    if (version !== 2) fail('VERSION_' + version);
    var total = view.getUint32(8, true);
    if (total !== buffer.byteLength) fail('LENGTH');
    var offset = 12, json = null, binary = null;
    while (offset < buffer.byteLength) {
      var length = view.getUint32(offset, true);
      var type = view.getUint32(offset + 4, true);
      offset += 8;
      var payload = new Uint8Array(buffer, offset, length);
      offset += length;
      if (type === 0x4E4F534A) json = JSON.parse(new TextDecoder('utf-8').decode(payload));
      else if (type === 0x004E4942) binary = payload;
    }
    if (!json) fail('NO_JSON_CHUNK');
    if (!binary) fail('NO_BIN_CHUNK');
    // In glTF a bufferView offset is relative to the start of the BUFFER, and in
    // a GLB that buffer is the BIN chunk payload, not the start of the file.
    // Reading the accessor offsets from the file start yields garbage geometry
    // and a camera that flies to infinity, so the accessor reader gets its own
    // DataView over the chunk.
    var data = new DataView(buffer, binary.byteOffset, binary.byteLength);
    if (json.extensionsUsed && json.extensionsUsed.length) fail('EXTENSIONS');
    if (json.animations && json.animations.length) fail('ANIMATIONS');
    if (json.skins && json.skins.length) fail('SKINS');
    if (json.textures && json.textures.length) fail('TEXTURES');
    if (!json.buffers || json.buffers.length !== 1) fail('BUFFER_COUNT');
    if (json.bufferViews.length) {
      for (var v = 0; v < json.bufferViews.length; v++) {
        var viewSpec = json.bufferViews[v];
        if (viewSpec.buffer !== 0) fail('BUFFER_VIEW_BUFFER');
      }
    }

    function accessor(index) {
      var spec = json.accessors[index];
      var components = TYPE_COUNT[spec.type];
      if (!components) fail('ACCESSOR_TYPE_' + spec.type);
      var comp = COMPONENTS[spec.componentType];
      if (!comp) fail('ACCESSOR_COMPONENT_' + spec.componentType);
      if (spec.bufferView === undefined) fail('ACCESSOR_NO_BUFFER_VIEW');
      var viewSpec = json.bufferViews[spec.bufferView];
      if (!viewSpec) fail('ACCESSOR_BUFFER_VIEW_MISSING');
      var stride = viewSpec.byteStride || (comp[1] * components);
      var start = (viewSpec.byteOffset || 0) + (spec.byteOffset || 0);
      var array = new comp[0](spec.count * components);
      var base = start % comp[1];
      var aligned = start - base;
      for (var i = 0; i < spec.count; i++) {
        var src = aligned + i * stride + base;
        if (src + comp[1] * components > data.byteLength) fail('ACCESSOR_OUT_OF_RANGE');
        for (var c = 0; c < components; c++) {
          var at = src + c * comp[1];
          var value;
          if (spec.componentType === 5126) value = data.getFloat32(at, true);
          else if (spec.componentType === 5125) value = data.getUint32(at, true);
          else if (spec.componentType === 5123) value = data.getUint16(at, true);
          else if (spec.componentType === 5121) value = data.getUint8(at);
          else if (spec.componentType === 5122) value = data.getInt16(at, true);
          else if (spec.componentType === 5120) value = data.getInt8(at);
          else fail('COMPONENT_READ');
          array[i * components + c] = value;
        }
      }
      return { array: array, components: components, count: spec.count, type: spec.type };
    }

    var group = new T.Group();
    group.name = (json.scenes && json.scenes[0] && json.scenes[0].name) || 'glb';
    var materialCache = {};

    function material(index) {
      if (materialCache[index]) return materialCache[index];
      var spec = json.materials[index];
      var pbr = spec.pbrMetallicRoughness || {};
      var base = pbr.baseColorFactor || [1, 1, 1, 1];
      var options = {
        color: new T.Color(base[0], base[1], base[2]),
        roughness: pbr.roughnessFactor === undefined ? 1 : pbr.roughnessFactor,
        metalness: pbr.metallicFactor === undefined ? 1 : pbr.metallicFactor,
        side: spec.doubleSided ? T.DoubleSide : T.FrontSide
      };
      if (spec.alphaMode === 'BLEND') {
        options.transparent = true;
        options.opacity = base[3] === undefined ? 1 : base[3];
        options.depthWrite = false;
      } else if (spec.alphaMode === 'MASK') {
        options.alphaTest = 0.5;
      }
      var built = new T.MeshStandardMaterial(options);
      built.name = spec.name || ('material_' + index);
      materialCache[index] = built;
      return built;
    }

    var ids = { parts: 0, with_id: 0, without_id: 0, suffixed: 0 };
    for (var n = 0; n < json.nodes.length; n++) {
      var node = json.nodes[n];
      var stableId = (node.extras && node.extras.stable_id) || null;
      var mesh = null;
      if (node.mesh !== undefined) {
        var meshSpec = json.meshes[node.mesh];
        var primitives = [];
        for (var p = 0; p < meshSpec.primitives.length; p++) {
          var primitive = meshSpec.primitives[p];
          if (primitive.mode !== undefined && primitive.mode !== 4) fail('PRIMITIVE_MODE');
          var position = accessor(primitive.attributes.POSITION);
          var geometry = new T.BufferGeometry();
          geometry.setAttribute('position', new T.BufferAttribute(position.array, 3));
          if (primitive.attributes.NORMAL !== undefined) {
            var normal = accessor(primitive.attributes.NORMAL);
            geometry.setAttribute('normal', new T.BufferAttribute(normal.array, 3));
          } else {
            geometry.computeVertexNormals();
          }
          if (primitive.indices !== undefined) {
            var indices = accessor(primitive.indices);
            geometry.setIndex(new T.BufferAttribute(indices.array, 1));
          }
          geometry.computeBoundingSphere();
          geometry.computeBoundingBox();
          var part = new T.Mesh(geometry, material(primitive.material));
          part.name = (node.name || ('node_' + n)) + ':' + p;
          // The Sightline object-ID pass reads userData.sightlineId off the
          // visible MESH. A node wrapper is not a mesh, so an id parked on the
          // wrapper is invisible to the pass and the capture fails closed to
          // RGB-only with an empty mask. The forge emits one primitive per
          // node, so the first primitive keeps the forge's exact stable_id; a
          // node with several primitives gets a suffixed id so ids stay unique.
          if (stableId) {
            part.userData.sightlineId = p === 0 ? stableId : stableId + '#' + (p + 1);
            part.userData.forgeStableId = stableId;
            ids.with_id++;
            if (p > 0) ids.suffixed++;
          } else {
            ids.without_id++;
          }
          ids.parts++;
          primitives.push(part);
        }
        mesh = new T.Group();
        mesh.name = (node.name || ('node_' + n)) + ':mesh';
        for (var m = 0; m < primitives.length; m++) mesh.add(primitives[m]);
      }
      var object = mesh || new T.Object3D();
      object.name = node.name || ('node_' + n);
      if (node.translation) object.position.fromArray(node.translation);
      if (node.rotation) object.quaternion.fromArray(node.rotation);
      if (node.scale) object.scale.fromArray(node.scale);
      // Deliberately NOT sightlineId on the wrapper: the adapter only reads
      // that key from meshes, and a duplicate id on a wrapper would be a
      // different id with the same text.
      if (stableId) object.userData.forgeStableId = stableId;
      group.add(object);
    }
    group.updateMatrixWorld(true);
    return { gltf: json, group: group, ids: ids };
  }

  function loadGlb(url, onLoad, onError) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';
    request.onload = function () {
      if (request.status !== 200) { if (onError) onError(new Error('GLB_HTTP_' + request.status)); return; }
      try { onLoad(parseGlb(request.response)); } catch (error) { if (onError) onError(error); }
    };
    request.onerror = function () { if (onError) onError(new Error('GLB_NETWORK')); };
    request.send();
  }

  global.SightlineGlb = { parseGlb: parseGlb, loadGlb: loadGlb };
})(typeof window !== 'undefined' ? window : this);
