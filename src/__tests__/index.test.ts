import tc from '../index';

test('tc', async () => {
  expect(tc).toHaveProperty('request');
  expect(tc).toHaveProperty('config');
  expect(tc).toHaveProperty('scf');
  expect(tc).toHaveProperty('cmq');
  expect(tc).toHaveProperty('apigateway');
});

describe('v2', function () {
  test.each(['cmq', 'apigateway'])('%s', async function (name) {
    tc.init('id', 'key');

    try {
      await tc[name]('Action', {});
    } catch (e) {
      expect(e.code).toEqual(4104);
    }
  });
});

describe('v3', function () {
  test.each(['scf'])('%s', async function (name) {
    tc.init('id', 'key');

    try {
      await tc[name]('Action', {});
    } catch (e) {
      expect(e.Response.Error.Code).toEqual('InvalidAction');
    }
  });
});
