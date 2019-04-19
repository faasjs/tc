import { Logger, request } from '@faasjs/utils';
import * as crypto from 'crypto';

const log = new Logger('faasjs.tc');

function mergeData(data: any, prefix: string = '') {
  const ret: any = {};
  for (const k in data) {
    if (data[k] === null) {
      continue;
    }
    if (data[k] instanceof Array || data[k] instanceof Object) {
      Object.assign(ret, mergeData(data[k], prefix + k + '.'));
    } else {
      ret[prefix + k] = data[k];
    }
  }
  return ret;
}

function formatSignString(params: any) {
  let str = '';
  const keys = Object.keys(params);
  keys.sort();
  for (const k in keys) {
    if (params.hasOwnProperty(k)) {
      str += ('&' + keys[k] + '=' + params[keys[k]]);
    }
  }
  return str.slice(1);
}

function req(method: string, url: string, params: any, config: any) {
  params = Object.assign({
    Nonce: Math.round(Math.random() * 65535),
    Region: params.region || config.region,
    SecretId: config.secretId,
    SignatureMethod: 'HmacSHA256',
    Timestamp: Math.round(Date.now() / 1000) - 1,
  }, params);
  params = mergeData(params);
  const sign = method + url + formatSignString(params);
  // console.log(sign);
  params.Signature = crypto.createHmac('sha256', config.secretKey).update(sign).digest('base64');
  return request('https://' + url, {
    body: params,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    method,
  });
}

module.exports = {
  config: {
    region: 'ap-beijing',
    secretId: null,
    secretKey: null,
  },
  request: req,
  v2res(res: any) {
    const body = JSON.parse(res.body);
    if (body.code === 0) {
      return body;
    } else {
      throw body;
    }
  },
  v3res(res: any) {
    const body = JSON.parse(res.body);
    if (body.Response.Error) {
      throw body;
    } else {
      return body.Response;
    }
  },
  init(id: string, key: string, region?: string) {
    this.config.secretId = id;
    this.config.secretKey = key;
    if (region) {
      this.config.region = region;
    }
  },
  /**
   * 请求云函数接口
   * @param action {string} 操作
   * @param params {object} 参数
   */
  scf(action: string, params: any) {
    log.debug('scf %s %o', action, params);

    params.Action = action;
    params.Version = '2018-04-16';
    return req('POST', 'scf.tencentcloudapi.com/?', params, this.config).then(this.v3res);
  },
  /**
   * 请求 API 网关接口
   * @param action {string} 操作
   * @param params {object} 参数
   */
  apigateway(action: string, params: any) {
    log.debug('apigateway %s %o', action, params);

    params.Action = action;
    return req('POST', 'apigateway.api.qcloud.com/v2/index.php?', params, this.config).then(this.v2res);
  },
  /**
   * 请求 CMQ 接口
   * @param action {string} 操作
   * @param params {object} 参数
   */
  cmq(action: string, params: any) {
    log.debug('cmq %s %o', action, params);

    params.Action = action;
    return req('POST', `cmq-queue-${params.Region}.api.qcloud.com/v2/index.php?`, params, this.config).then(this.v2res);
  },
};
