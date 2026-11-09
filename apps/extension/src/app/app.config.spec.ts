import { extensionDeviceName } from './app.config';

describe('extensionDeviceName', () => {
  it('says it is the extension, and in which browser', () => {
    const edgeWindows =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Edg/130.0';
    expect(extensionDeviceName(edgeWindows)).toBe('AndThen extension in Edge on Windows');
    expect(extensionDeviceName('x').length).toBeLessThanOrEqual(80);
  });
});
