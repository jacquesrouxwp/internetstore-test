import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune } from '@gltf-transform/functions';
import { createDecoderModule, createEncoderModule } from 'draco3dgltf';
import { statSync, copyFileSync } from 'fs';

// backup original with textures if still large
const before = statSync('public/thermal/models/deer.glb').size;
console.log('before', before);

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
io.registerDependencies({
  'draco3d.decoder': await createDecoderModule(),
  'draco3d.encoder': await createEncoderModule(),
});

const doc = await io.read('public/thermal/models/deer.glb');
for (const tex of doc.getRoot().listTextures()) {
  console.log('dispose texture', tex.getMimeType(), tex.getImage()?.byteLength);
  tex.dispose();
}
for (const mat of doc.getRoot().listMaterials()) {
  mat.setBaseColorTexture(null);
  mat.setMetallicRoughnessTexture(null);
  mat.setNormalTexture(null);
  mat.setOcclusionTexture(null);
  mat.setEmissiveTexture(null);
  mat.setBaseColorFactor([1, 1, 1, 1]);
  mat.setMetallicFactor(0);
  mat.setRoughnessFactor(1);
  mat.setEmissiveFactor([0, 0, 0]);
  // drop heavy material extensions
  mat.setExtension('KHR_materials_specular', null);
  mat.setExtension('KHR_materials_ior', null);
}
await doc.transform(dedup(), prune());
await io.write('public/thermal/models/deer.glb', doc);
console.log('after', statSync('public/thermal/models/deer.glb').size);
