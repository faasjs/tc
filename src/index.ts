import { Logger, request } from '@faasjs/utils';
import * as crypto from 'crypto';

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
  const str: string[] = [];

  for (const key of Object.keys(params).sort()) {
    str.push(key + '=' + params[key]);
  }

  return str.join('&');
}

/**
 * 腾讯云
 */
class TC {
  public config: {
    secretId?: string;
    secretKey?: string;
    region?: string;
  };
  public logger: Logger;

  constructor(secretId?: string, secretKey?: string, region?: string) {
    this.config = {};

    if (secretId) {
      this.config.secretId = secretId;
    }

    if (secretKey) {
      this.config.secretKey = secretKey;
    }

    if (region) {
      this.config.region = region;
    }

    this.logger = new Logger('faasjs.tc');
  }

  public init(secretId?: string, secretKey?: string, region: string = 'ap-beijing') {
    if (secretId) {
      this.config.secretId = secretId;
    }

    if (secretKey) {
      this.config.secretKey = secretKey;
    }

    if (region) {
      this.config.region = region;
    }
  }

  public request(method: string, url: string, params: any, config?: {
    region?: string;
    secretId?: string;
    secretKey?: string;
  }) {
    if (!config) {
      config = this.config;
    }

    if (!config.secretId || !config.secretKey) {
      throw Error('secretId and secretKey are required.');
    }

    params = Object.assign({
      Nonce: Math.round(Math.random() * 65535),
      Region: params.region || config.region,
      SecretId: config.secretId,
      SignatureMethod: 'HmacSHA256',
      Timestamp: Math.round(Date.now() / 1000) - 1,
    }, params);
    params = mergeData(params);

    const sign = method + url + formatSignString(params);

    params.Signature = crypto.createHmac('sha256', config.secretKey).update(sign).digest('base64');

    return request('https://' + url, {
      body: params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      method,
    });
  }

  /**
   * 云函数接口
   * @param action {string} 操作
   * @param params {object} 参数
   */
  public scf(action: string, params: any) {
    this.logger.debug('scf %s %o', action, params);

    params.Action = action;
    params.Version = '2018-04-16';
    return this.request('POST', 'scf.tencentcloudapi.com/?', params).then(this.v3res);
  }

  /**
   * API 网关接口
   * @param action {string} 操作
   * @param params {object} 参数
   */
  public apigateway(action: string, params: any) {
    this.logger.debug('apigateway %s %o', action, params);

    params.Action = action;
    return this.request('POST', 'apigateway.api.qcloud.com/v2/index.php?', params).then(this.v2res);
  }

  /**
   * CMQ 接口
   * @param action {string} 操作
   * @param params {object} 参数
   */
  public cmq(action: string, params: any) {
    this.logger.debug('cmq %s %o', action, params);

    params.Action = action;
    return this.request(
      'POST',
      `cmq-queue-${params.Region}.api.qcloud.com/v2/index.php?`,
      params).then(this.v2res);
  }

  private v2res(res: any) {
    const body = JSON.parse(res.body);
    if (body.code === 0) {
      return body;
    } else {
      throw body;
    }
  }

  private v3res(res: any) {
    const body = JSON.parse(res.body);
    if (body.Response.Error) {
      throw body;
    } else {
      return body.Response;
    }
  }
}

/**
 * 默认生成的共用 TC 实例
 */
const tc = new TC();

export {
  TC,
  tc,
};

export default tc;
