// TWA 项目生成脚本（用于 GitHub Actions）
const path = require('path');
const { TwaManifest, TwaGenerator } = require('@bubblewrap/core');

async function main() {
  const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
  const projectDir = path.join(workspace, 'twa-project');

  console.log('📱 从线上 manifest 生成 TWA 项目...');

  // 从 web manifest 创建 TWA Manifest
  const twaManifest = await TwaManifest.fromWebManifest(
    'https://m0rant.github.io/-/manifest.json'
  );

  // 包名
  twaManifest.packageId = 'com.m0rant.studytimer';

  // 签名信息
  twaManifest.signingKey = {
    path: path.join(workspace, 'release.keystore'),  // 使用仓库中的固定密钥
    alias: 'studytimer'
  };

  // 版本
  twaManifest.appVersionCode = 1;
  twaManifest.appVersion = '1.0.0';

  // 通知
  twaManifest.enableNotifications = true;

  // 回退模式
  twaManifest.fallbackType = 'customtabs';

  console.log('✅ Manifest 配置完成');
  console.log('   包名:', twaManifest.packageId);
  console.log('   域名:', twaManifest.host);
  console.log('   应用名:', twaManifest.name);

  // 生成项目
  const generator = new TwaGenerator();
  const log = {
    debug: () => {},
    info: (msg) => console.log('  ✓', msg),
    warn: (msg) => console.log('  ⚠️', msg),
    error: (msg) => console.error('  ❌', msg)
  };

  await generator.createTwaProject(projectDir, twaManifest, log);

  console.log('✅ TWA 项目已生成:', projectDir);

  // 添加强签名配置
  const fs = require('fs');
  const buildGradlePath = path.join(projectDir, 'app', 'build.gradle');
  let buildGradle = fs.readFileSync(buildGradlePath, 'utf8');

  // 添加签名配置
  const signingConfig = `
    signingConfigs {
        release {
            storeFile file('../../release.keystore')
            storePassword 'android123'
            keyAlias 'studytimer'
            keyPassword 'android123'
        }
    }`;

  // 在 buildTypes 之前插入 signingConfigs
  buildGradle = buildGradle.replace(
    '    buildTypes {',
    signingConfig + '\n    buildTypes {'
  );

  // 给 release build 添加签名
  buildGradle = buildGradle.replace(
    '            minifyEnabled true',
    '            minifyEnabled true\n            signingConfig signingConfigs.release'
  );

  fs.writeFileSync(buildGradlePath, buildGradle);
  console.log('✅ 签名配置已添加');
}

main().catch(err => {
  console.error('❌ 失败:', err);
  process.exit(1);
});
