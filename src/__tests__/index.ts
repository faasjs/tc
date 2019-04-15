import * as tc from '../index';

test('tc', async () => {
  expect(tc).toHaveProperty('request');
  expect(tc).toHaveProperty('config');
  expect(tc).toHaveProperty('scf');
  expect(tc).toHaveProperty('cmq');
  expect(tc).toHaveProperty('apigateway');
});
