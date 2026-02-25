const path = require('path');

module.exports = {
  outDir: 'dist',
  packagerConfig: {
    name: 'Autogiro Tour Guide',
    icon: path.resolve(__dirname, 'build', 'icon'),
    asar: true,
    ignore: [
      /^\/src$/,
      /^\/\.vite$/,
      /^\/tsconfig/,
      /^\/electron\.vite\.config/,
      /^\/forge\.config/,
      /^\/dist$/,
      /^\/build$/,
      /^\/autogiro_icon\.png$/,
    ],
  },
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'linux', 'win32'],
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        name: 'Autogiro Tour Guide',
      },
    },
  ],
};
