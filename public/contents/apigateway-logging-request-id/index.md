---
title: 多段 API Gateway 構成における分散トレーシングの課題を解決し、トレーサビリティを向上させるログ戦略
tags:
  - "APIGateway"
  - "AWS"
img: /contents/apigateway-logging-request-id/overview.png
date: 2023/02/01
---

# 目次

# 多段 API Gateway 構成

AWS において、マイクロサービスアーキテクチャパターンを採用する多くの場合、Amazon API Gateway を複数使用する場合があります。

例えば、EC サイトにおけるバックエンドを下図のように構成するケースを考えます。下図は、バックエンドで稼働する複数のサービス（Catalog サービスと Cart サービス）を BFF がラップし、集約します。
このようなケースでは、クライアントから送信されたリクエストを各マイクロサービスにおいてトレースが困難になります。

本記事では Amazon API Gateway を使用した構成に対して、トレーサビリティを向上するログ戦略を立て、実践します。以下、このように API Gateway を複数ラップする構成を **多段 API Gateway** として表現します。

![overview](/contents/apigateway-logging-request-id/overview.png)
※ Load Balancer は簡単化のために省略しています。

# 分散トレーシングにおける課題と解決策

マイクロサービスアーキテクチャパターンを採用する多くの場合、リクエストは複数のサービスにまたがります。
各サービスは、DB へのクエリやメッセージの発行など、1 つ以上の操作を実行することでリクエストを処理します。
１つのクライアントから送信されたリクエストに紐づくことをトレースするために、各サービスに対して発行されたリクエストを１意に特定するための ID が必要となります。

これは、一般的に [分散トレーシング](https://microservices.io/patterns/observability/distributed-tracing.html) における解決策として知られており、[microservice.io](https://microservices.io)では以下のように解決策が記載されています。

> **Solution**
>
> 1. Assigns each external request a unique external request id
> 2. Passes the external request id to all services that are involved in handling the request
> 3. Includes the external request id in all log messages
> 4. Records information (e.g. start time, end time) about the requests and operations performed when handling a external request in a centralized service
>
> 引用）[Microservice Architecture / Pattern: Distributed tracing](https://microservices.io/patterns/observability/distributed-tracing.html)

それでは、各項目について API Gateway とそのバックエンドで稼働するアプリケーションの実装例を見ていきましょう。

## ① API Gateway にて一意な リクエスト ID を生成する

API Gateway にはリクエストに対して一意のリクエスト ID を割り当てる機能があります。

> $context.requestId は、x-amzn-RequestId ヘッダーの値をログに記録します。クライアントは、x-amzn-RequestId ヘッダーの値を上書きできます。API Gateway は、x-amzn-RequestId レスポンスヘッダー内のこのリクエスト ID を返します。$context.extendedRequestId は、API Gateway が生成する一意の ID です。API Gateway は、x-amz-apigw-id レスポンスヘッダー内のこのリクエスト ID を返します。
>
> 引用）[API Gateway での CloudWatch による REST API のログの設定](https://docs.aws.amazon.com/ja_jp/apigateway/latest/developerguide/set-up-logging.html#:~:text=%24context.requestId%20%E3%81%AF%E3%80%81x%2Damzn%2DRequestId%20%E3%83%98%E3%83%83%E3%83%80%E3%83%BC%E3%81%AE%E5%80%A4%E3%82%92%E3%83%AD%E3%82%B0%E3%81%AB%E8%A8%98%E9%8C%B2%E3%81%97%E3%81%BE%E3%81%99%E3%80%82%E3%82%AF%E3%83%A9%E3%82%A4%E3%82%A2%E3%83%B3%E3%83%88%E3%81%AF%E3%80%81x%2Damzn%2DRequestId%20%E3%83%98%E3%83%83%E3%83%80%E3%83%BC%E3%81%AE%E5%80%A4%E3%82%92%E4%B8%8A%E6%9B%B8%E3%81%8D%E3%81%A7%E3%81%8D%E3%81%BE%E3%81%99%E3%80%82API%20Gateway%20%E3%81%AF%E3%80%81x%2Damzn%2DRequestId%20%E3%83%AC%E3%82%B9%E3%83%9D%E3%83%B3%E3%82%B9%E3%83%98%E3%83%83%E3%83%80%E3%83%BC%E5%86%85%E3%81%AE%E3%81%93%E3%81%AE%E3%83%AA%E3%82%AF%E3%82%A8%E3%82%B9%E3%83%88%20ID%20%E3%82%92%E8%BF%94%E3%81%97%E3%81%BE%E3%81%99%E3%80%82%24context.extendedRequestId%20%E3%81%AF%E3%80%81API%20Gateway%20%E3%81%8C%E7%94%9F%E6%88%90%E3%81%99%E3%82%8B%E4%B8%80%E6%84%8F%E3%81%AE%20ID%20%E3%81%A7%E3%81%99%E3%80%82API%20Gateway%20%E3%81%AF%E3%80%81x%2Damz%2Dapigw%2Did%20%E3%83%AC%E3%82%B9%E3%83%9D%E3%83%B3%E3%82%B9%E3%83%98%E3%83%83%E3%83%80%E3%83%BC%E5%86%85%E3%81%AE%E3%81%93%E3%81%AE%E3%83%AA%E3%82%AF%E3%82%A8%E3%82%B9%E3%83%88%20ID%20%E3%82%92%E8%BF%94%E3%81%97%E3%81%BE%E3%81%99%E3%80%82)

以下図のように、API Gateway はクライアントからリクエストされたログを２種類の方法で記録します。

![apigateway-logging-requestId](/contents/apigateway-logging-request-id/apigateway-logging-requestId.png)

| パラメータ                 | 説明                                                                                                                                       |
| :------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------- |
| $context.requestId         | リクエストヘッダーの x-amazn-RequestId の値を記録します。リクエストヘッダーに x-amazn-RequestId が含まれない場合、一意な ID を生成します。 |
| $context.extendedRequestId | API Gateway が生成する一意の ID を記録します。この値は上書きすることはできません。 なお、この ID は $context.requestId とは異なります。    |

この２種類のリクエスト ID を使い分けることで、バックエンドで稼働するマイクロサービスに対して ID を一意に割り振ることができます。

基本的には外部リクエスト ID として BFF の API Gateway が発行した `$context.requestId` を全てのサービスへのリクエストで渡す戦略を考えます。本章で解説するシステムコンポーネントの責務とその概要を図示しています。

![overview-tracing](/contents/apigateway-logging-request-id/apigateway-logging-overview-tracing-simple.png)

API Gateway の機能において生成される リクエスト ID をログに記録します。$context.requestId, $context.extendedRequestId 自体は API Gatway の $context 変数でしかありません。まずはこの変数をロググループに書き込みます。

概して CloudWatch Logs のロググループは AWS の各種リソースに対して１体１となるように作ることが推奨されています。これは Infrastructure as Code 管理する前提で、各種リソースのデプロイ容易性を高めることや、検索性を柔軟にすること、また [PutEvents API のクォータ](https://docs.aws.amazon.com/ja_jp/AmazonCloudWatch/latest/logs/cloudwatch_limits_cwl.html) に配慮することが目的です。

![cloudwatchlogs](/contents/apigateway-logging-request-id/apigateway-logging-overview-and-cloudwatch.png)

ただし、ログに出力する項目の **プロパティ（キー）や、ログフォーマット (CLF や JSON, XML, CSV など）は、アプリケーション全体で統一しておくとメリットがあります。**
例えば API Gateway 、ECS が以下のように異なるプロパティ（キー）・ログフォーマットで出力した場合を考えましょう。

こうしてしまった場合、アプリケーション全体で横断的に一意なリクエスト ID で検索したい場合に `requestId` と `request-id` を区別しなければならず、
ユーザからのリクエストを一意に特定することが困難になります。

**~ API Gateway ログ (JSON) ~**

```
{
  "requestId": "$context.requestId",
  "extendedRequestId": "$context.extendedRequestId",
  "ip": "$context.identity.sourceIp",
  "caller": "$context.identity.caller",
  "user": "$context.identity.user",
  "requestTime": "$context.requestTime",
  "httpMethod": "$context.httpMethod",
  "resourcePath": "$context.resourcePath",
  "status": "$context.status",
  "protocol": "$context.protocol",
  "responseLength": "$context.responseLength"
}
```

**~ ECS アプリケーションログ (CSV) ~**

```
request-id, extended-request-id, ip, caller, user, request-time, http-method, resource-path, status, protocol, response-length
```

ElasticSearch や DataDog のような分散アプリケーションのログトレースを容易にするサービスを使っていたとしても、フォーマットが異なる場合、ログのパース処理が必要となってしまいます。
分散アプリケーション全体では、**一意なリクエスト ID はプロパティ（キー）を揃え、同じログフォーマットで出力する** と良いでしょう。

## ② API Gateway の統合リクエストパラメータに リクエスト ID を渡す

[Amazon API Gateway API リクエストおよびレスポンスデータマッピングリファレンス](https://docs.aws.amazon.com/ja_jp/apigateway/latest/developerguide/request-response-data-mappings.html) によると、APIGateway から後続のバックエンドサービス（今回は ECS）にリクエストする際にパラメータをマッピングできます。

今回の要件では API Gateway が生成した context.requestId を ECS に渡したいので、ヘッダーに付与してみましょう。

![apigateway-request-mapping](/contents/apigateway-logging-request-id/apigateway-request-mapping.png)

```
integration.request.header.apiGateway-requestId: context.requestId
integration.request.header.apiGateway-extendedRequestId: context.extendedRequestId
```

これによって、ECS に渡される HTTP リクエストのヘッダーにリクエスト ID を含めることができました。

## ③ ECS アプリケーションにて リクエスト ID をログに出力する

ここでは Node.js における実装例を紹介しますが、どの Web アプリケーションでも考え方は同じです。
リクエスト単位にとりまわせるコンテキスト変数を保持し、処理の随所に出力するログにリクエスト ID を記録します。
Java では [ThreadLoacal](https://docs.oracle.com/javase/jp/8/docs/api/java/lang/ThreadLocal.html) を使用することが多いですね。

[express](https://expressjs.com/ja/) を使用した Web アプリケーションを TypeScript で作成します。Logger には [pino](https://github.com/pinojs/pino) を使用します。

```bash
$ yarn add express pino express-pino-logger uuid express
$ yarn add -D @types/expres @types/express-pino-logger @types/node @types/uuid ts-node typescript
```

pino には ログ出力する内容を指定するオプションとして `serializers`、リクエスト ID を指定するオプションとして `genReqId` があります。
以下のように実装しましょう。これで HTTP ヘッダーの値を読み込んでログに出力する リクエスト ID を一意に指定できます。また、`serializers` によって リクエスト ID のキーを `requestId` に変更しています。

**_logger.ts_**

```ts
import pino from "pino";
import ExpressPinoLogger from "express-pino-logger";
import { IncomingMessage } from "http";
import { v4 as uuidv4 } from "uuid";

export const logger = pino({
  level: "info",
});

export const loggingMiddleware = ExpressPinoLogger({
  level: "info",
  serializers: {
    req: (req) => ({
      ...req,
      requestId: req.id, // serializers によってキーを指定して出力する
    }),
  },
  genReqId: (req: IncomingMessage) => {
    return req.headers["apigateway-request-id"] || uuidv4(); // API Gateway の統合リクエストでマッピングされた値を取得する
  },
});
```

express には以下のように組み込みます。

**_index.ts_**

```ts
import express from "express";
import { logger, loggingMiddleware } from "./logger";

const app = express();
app.use(loggingMiddleware);

// respond with "hello world" when a GET request is made to the homepage
app.get("/", (req, res) => {
  res.send("hello world");
});

const PORT = 8080;

app.listen(PORT, () => {
  logger.info(`Server now listening at http://localhost:${PORT}`);
});
```

出力されるログは以下のようになります。

```
{
  "level": 30,
  "time": 1653218009516,
  "pid": 21222,
  "hostname": "my-hostname",
  "req": {
    "id": "e1d29258-d66e-4c78-97a0-72a91a7e983a",
    "method": "GET",
    "url": "/",
    "query": {},
    "params": {},
    "headers": {
      "apigateway-request-id": "e1d29258-d66e-4c78-97a0-72a91a7e983a" // API Gateway の統合リクエストでマッピングされた値
    },
    "remoteAddress": "::1",
    "remotePort": 55849,
    "requestId": "e1d29258-d66e-4c78-97a0-72a91a7e983a" // serializers によってキーを指定して出力
  },
  "res": {
    "statusCode": 200,
    "headers": {
      "x-powered-by": "Express",
      "content-type": "text/html; charset=utf-8",
      "content-length": "11",
      "etag": "W/\"b-Kq5sNclPz7QV2+lfQIuc6R7oRu0\""
    }
  },
  "responseTime": 1,
  "msg": "request completed"
}
```

これで、アプリケーションが出力するログに API Gatway から発行されたリクエスト ID を記録することができました。

## ④ 外部リクエストのヘッダーに リクエスト ID を渡す

コンテキスト変数に保持しているリクエスト ID を使用して、外部への API リクエストの HTTP ヘッダーにリクエスト ID を付与します。
まずは express において、リクエストヘッダーから取得した requestId をリクエスト単位に取り回す方法を検討しましょう。
本記事では、 [express-http-context](https://github.com/skonves/express-http-context) も使用していきます。
このライブラリを使用することで、リクエストスコープのコンテキストをどこからでも取得・設定できます。また、API コール用に [axios](https://github.com/axios/axios) もインストールしておきます。

```
$ yarn add axios express-http-context
```

**_index.ts_**

```ts
import express from "express";
import { logger, loggingMiddleware } from "./logger";
import context from "express-http-context";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";

const app = express();
app.use(loggingMiddleware);
app.use(context.middleware);

// APIGateway の統合リクエストパラメータにセットされたリクエスト ID を取得する
const setRequestId = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  context.set("requestId", req.headers["apigateway-request-id"] || uuidv4());
  next();
};

// respond with "hello world" when a GET request is made to the homepage
app.get("/", setRequestId, async (req, res) => {
  // Call api with requestId header
  await axios.get("https://your.backend.apigateway.domain", {
    headers: {
      "x-amazn-RequestId": context.get("requestId"), // Backend で稼働する APIGateway の $context.requestId を上書きする
    },
  });

  res.send("hello world");
});

const PORT = 8080;

app.listen(PORT, () => {
  logger.info(`Server now listening at http://localhost:${PORT}`);
});
```

これで、後続の APIGateway にもリクエスト ID を伝搬することができました。

# まとめ

分散トレーシング、特に Amazon API Gateway を多段に組む構成における実装例を紹介しました。
従来のモノリシックなアーキテクチャでは１つのコンテキストに一意なリクエスト ID を保持するだけで良いですが、コンポーネントが分散している場合、その各所においてリクエスト ID の一意性を保証しなければなりません。
このプラクティスはシンプルでありながら、非常に実践的であり、プロダクション運用には不可欠なものです。ログ設計の際には取りこぼさず、考慮しておきたいものですね。
