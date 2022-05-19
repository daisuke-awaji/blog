---
title: Effective AppSync  〜 Serverless Framework を使用した AppSync の実践的な開発方法とテスト戦略 〜
date: '2020/12/02'
tags:
  - 'GraphQL'
  - 'Serverless Framework'
---

![appsync](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/163591/4211b642-0999-a38d-7b99-38b000ab69ee.gif)

AppSync は AWS が提供するマネージド GraphQL サービスです。Amplify と統合することにより、スキーマさえ宣言すれば GraphQL の Query, Mutation, Subscription コードを自動生成します。バックエンド GraphQL エンドポイントやデータソースを構築し、即座に動く環境が手に入ります。

[こちら](https://qiita.com/G-awa/items/a5b2cc7017b1eceeb002) は過去の記事ですが、リアルタイム掲示板アプリの主要機能を 15 分で作った例を紹介しています。

PoC のように使用する分には Amplify CLI を使用してサクッと開発してしまう方法が効果的ですが、実際のプロダクト開発ではそれだけでは不十分な場合が多いでしょう。複数環境へのデプロイの戦略、テストをどうするか、マイクロサービスバックエンドと接続するにはどのようなパッケージ構成にするべきかなど、課題が山積します。

本記事では AppSync をどのようにテストするべきか、ローカルでどのように開発を行い、CI/CD のフローに乗せていくべきかを考察し、１つの案を提示します。

AppSync の概要について理解している方は、[このあたりから](#appsync-を構築するいくつかの方法)読むとよいかと思います。

なお、サンプルソースは[こちらのリポジトリ](https://github.com/daisuke-awaji/serverless-appsync-offline-typescript-template)にホストしています。Serverless Framework の template として公開していますので、以下コマンドで作成ください。

```
$ serverless create \
  --template-url https://github.com/daisuke-awaji/serverless-appsync-offline-typescript-template \
  --path myService
```

## AppSync とは

AppSync は AWS が提供するマネージド GraphQL サービスです。AWS の各種バックエンド（DynamoDB, Aurora, Elasticsearch, Lambda など）とシームレスに結合ができ、すばやく API バックエンドを構築できます。また、Subscription という機能により、複数クライアントが同時編集できる Web アプリケーションや、リアルタイムなチャットアプリを簡単に実現できます。

![仕組み](https://d1.awsstatic.com/AppSync/product-page-diagram_AppSync@2x.d46d96d1e27169aa5005223299068da899280538.png)

### なぜ GraphQL が求められるのか

![spa.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/163591/5868cfdf-7e58-5b54-eb49-a668ca2010d5.png)

バックエンドに REST API、フロントエンドに React（または Vue.js や Angular）といった構成は一般的でしょう。バックエンドとフロントエンドは Rest の API 定義を互いに共有し、開発を進めます。有名なツールとして [OpenAPI](https://github.com/OAI/OpenAPI-Specification) があります。OpenAPI による定義を介することで、私たちは以下のような恩恵を得ることができました。

#### OpenAPI による恩恵

- API 定義を YAML 形式のファイルで管理する
- HTML 形式の API ドキュメントを自動生成する
- API 定義をコミュニケーションのハブとし、フロントエンドとバックエンドの開発体制を分離する
- OpenAPI 定義からフロントエンドで使用する API コール用のコードを自動生成する
- バックエンドのバリデーションは OpenAPI 定義から自動生成する
- バックエンドのモックサーバを自動構築する

![openapi-ページ1.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/163591/7eb8521e-57d5-cb65-debb-52e688055e2d.png)

コードを自動生成するツールは、以下の openapi-generator が有名です。

<a href=""><img src="https://github-link-card.s3.ap-northeast-1.amazonaws.com/OpenAPITools/openapi-generator.png" width="460px"></a>

#### REST API 開発の課題

OpenAPI とそのエコシステムの登場によって、REST API 開発は随分と楽になりましたが、依然として課題は残り続けるものです。REST API 開発における課題には以下のようなものが挙げられます。

- API の叩き方が決まっていない（API によって自由に決められてしまう）
- １ページ表示するために、いくつも API を実行しなければいけない。
- 不要なフィールドまで API で取得してしまう。

REST という思想は素晴らしいですが、リソースベースにアプリケーションを作成していくとどうしてもこのような課題が発生します。フロントエンドは必要なデータを必要なだけ１クエリで取得したい。バックエンドは必要なデータを素早く漏れなく提供したいのです。

#### GraphQL が解決すること

<img width="50%" src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/GraphQL_Logo.svg/1200px-GraphQL_Logo.svg.png" />

REST API 開発の課題を解決するために GraphQL は誕生しました。

ちょうど Web 業界全体がモバイルにシフトしていた頃の話です。2012 年 2 月に、Facebook のエンジニアが GraphQL の最初のプロトタイプをチームに共有した時には最高にクールな瞬間だったでしょう。[GraphQL: The Documentary](https://www.youtube.com/watch?v=783ccP__No8) というドキュメンタリーが製作されています。

GraphQL は以下のような特徴を持っており、REST API 開発の課題を解決します。

- スキーマとよばれる API の型定義により、フロントエンドとバックエンドがコミュニケーションをとる。
- クライアントは /graphql という単一のエンドポイントにアクセスすることでクリーンなインタフェースを保つ。
- クライアントが指定したフィールドだけを取得する。
- サブスクリプションを使用してリアルタイム処理を行う。

GraphQL を使用することでフロントエンドは必要なデータを必要なだけ１クエリで取得できるようになります。例えば以下の例では、SNS アプリケーションにおいて、ユーザと友達の情報を取得する場合のリクエストを表しています。

![graphqlvsrest.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/163591/7de4eb56-f779-a55a-0e6f-033bae5f593f.png)

REST の場合、ユーザ１件取得の API（/uesrs/:userId）と友達一覧取得の API（/users/:userId/friends）の２つを呼び出しています。レスポンスには画面に表示する必要のない不必要なフィールドも含まれるのでしょう。一方で GraphQL の場合は必要なフィールドをネスト構造で指定し、１リクエストで画面表示に必要な情報を取得しています。

### AppSync の役割

<img width="50%" src="https://media.graphcms.com/jN6lJfSgCNnGe6H5QGgS">

GraphQL は優れたソリューションですが、自前で構築するにはいくらかの苦労を伴います。

- 認証、認可処理を記述する。
- 各種バックエンドデータソースにアクセスするリゾルバーを作成する。
- WebSocket を使用するため、GraphQL サーバがスケールしても問題ないように、Redis などのデータストアを用意する。
- グローバルにエラーハンドリングして Node アプリケーションが落ちないように配慮する。
- ログを出力する。
- etc...（その他の数えきれない苦労）

AppSync は上記の苦労を限りなく少なくできます。例えば、認証・認可処理は Cognito UserPool と連携できますし、サーバのスケーラビリティは意識する必要がありません。ログ出力も標準搭載されており、INFO や ERROR などのレベルに応じて出力する設定ができます（もちろん CloudWatchLogs に出力されます）

## AppSync の基本

AppSync の構成要素は大きく分けて、以下の３つです。

- **Schema**
- **DataSource**
- **Resolver**

GraphQL の型は Schema として宣言します。Resolver は GraphQL リクエストを Resolver リクエストに変換します。この Resolver に実質的なロジックが集約することになります。Resolver リクエストは、DataSource にアクセスし、データをクライアントに返却します。

![openapi-ページ6.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/163591/0daa68d7-1482-8ff5-31b6-86f414b78a2b.png)

一部、[公式ドキュメント](https://docs.aws.amazon.com/ja_jp/appsync/latest/devguide/designing-a-graphql-api.html)より抜粋しています。

### Schema / スキーマ

各 GraphQL API は単一の GraphQL スキーマで定義されます。以下はスキーマの例です。

```graphql
type Task {
  id: ID!
  name: String!
  status: String!
}

type Query {
  getTask(id: ID!, status: String!): Task
}
```

### DataSource / データソース

データソースは、GraphQL API で操作できる AWS アカウント内のリソースです。AWS AppSync は、以下をデータソースとしてサポートしています。

- AWS Lambda
- Amazon DynamoDB
- リレーショナルデータベース (Amazon Aurora Serverless)
- Amazon Elasticsearch Service
- HTTP エンドポイント

AWS AppSync API は、複数のデータソースを操作するよう設定できます。これにより、単一の場所にデータを集約できます。

### Resolver / リゾルバー

GraphQL リゾルバーは、タイプのスキーマのフィールドをデータソースに接続します。リゾルバーはリクエストを実行するメカニズムです。

AWS AppSync のリゾルバーは、Apache Velocity Template Language (VTL) で記述されたマッピングテンプレートを使用して、GraphQL 表現をデータソースで使用できる形式に変換します。

## AppSync を構築するいくつかの方法

さて、そろそろ本題に移ります。AppSync を構築するためにはいくつかの方法があるでしょう。

| 方法                       | メリット                                                                                                                                                                                        | デメリット                                                                                                                                                            |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AWS コンソール画面から作成 | 直感的なインタフェースで作成でき、簡単に検証できる                                                                                                                                              | 複数の環境に全く同じ構成で構築しづらい<br/> デリバリーを自動化できない                                                                                                |
| AWS CLI                    | デリバリーを自動化できる                                                                                                                                                                        | 冪等性を持たないので、エラー発生時にリカバリが困難                                                                                                                    |
| AWS CloudFormation         | デリバリーを自動化できる<br/> 冪等性があり、エラー発生時に元の状態にもどる                                                                                                                      | スキーマ定義ファイルを S3 に配置するなどの手間が多い <br/> YAML のコード量が多すぎる                                                                                  |
| Amplify CLI                | デリバリーを自動化できる<br/> Cloudformation のコードを自動生成、即座に環境構築ができる<br/> 冪等性があり、エラー発生時に元の状態にもどる                                                       | amplify コマンドが抽象化しすぎていて、何かあった時に解決が困難 <br/> Amplify CLI の学習コスト（かなり独特な使い心地）<br/> ローカルでテストできるツールセットが少ない |
| Serverless Framework       | デリバリーを自動化できる<br/> 適度に抽象化しており、細部まで定義しようと思えば全てを記述できる <br/>冪等性があり、エラー発生時に元の状態にもどる <br/> ローカルでテストできるツールセットが豊富 | Serverless Framework の学習コスト（そんなにない）<br/>                                                                                                                |

それぞれ、開発するプロダクトの特性に合わせて選定すべきです。たとえば PoC 的にプロトタイプをすぐに作りたいのなら **AWS コンソール画面から作成** するか **Amplify CLI** を使用する方法が良いでしょう。 プロダクションでの使用を見据えてテスト環境やステージング複数など、複数の環境にデプロイする必要があるのなら **AWS CloudFormation** か **Serverless Framework** の使用をお勧めします。

本記事では、AppSync をローカルでテストする方法を紹介するために、**Serverless Framework** を使用した開発方法をガイドします。

## Serverless Framework for Appsync

![serverlessappsync.gif](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/163591/4211b642-0999-a38d-7b99-38b000ab69ee.gif)

Serverless Framework を使用して AppSync を構築するためには以下の２通りの方法があります。

- [Serverless AppSync Plugin](https://github.com/sid88in/serverless-appsync-plugin)
  Serverless Framework のプラグインです。ローカルの schema.graphql や mapping-template を参照し、AppSync をデプロイします。

- [Serverless Components / aws-app-sync](https://github.com/serverless-components/aws-app-sync)
  Serverless Components の AppSync コンポーネントです。最小限のコード量で AppSync に加えて、カスタムドメインまでついた意味のある単位のリソース群をデプロイします。

本記事では Serverless AppSync Plugin の方法を説明します。基本的な Serverless Framework の使用方法は割愛します。公式のドキュメントか、[堀家](https://qiita.com/horike37) さんの記事「[Serverless Framework の使い方まとめ](https://qiita.com/horike37/items/b295a91908fcfd4033a2)」がとてもわかりやすく説明されていますので。そちらをご参照ください。

### Serverless AppSync Plugin

Serverless AppSync Plugin を使用して、DynamoDB と Lambda をデータソースとした AppSync を作成していきます。Serverless AppSync Plugin はその他に、Elasticsearch や HTTP データソースもサポートしています。

![](https://user-images.githubusercontent.com/1587005/36063617-fe8d4e5e-0e33-11e8-855b-447513ba7084.png)

タスク管理アプリを想定した AppSync を実装します。タスク情報は DynamoDB テーブルにストアされ、各種 CRUD 操作ができます。アプリケーションのバージョンや名前の情報は Lambda が返却する構成にしています。

![openapi-ページ3.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/163591/984d9272-44e3-a88b-4845-4f12f3346f72.png)

以下のような **しょぼ Trello** のようなアプリケーションのバックエンドになります。

![a](https://user-images.githubusercontent.com/20736455/90215011-5772dd80-de35-11ea-8be8-06196c5e3b19.gif)

#### Serverless プロジェクトを開始する

まずは Serverless Framework の AWS/TypeScript ボイラーテンプレートからプロジェクトのひな形を作ります。

```
$ serverless create --template aws-nodejs-typescript
```

lulzneko さんの「[Serverless Framework と TypeScript でサーバレス開発事始め
](https://riotz.works/articles/lulzneko/2018/02/01/beginning-serverless-dev-with-serverless-framework-and-typescript/)」という記事でとても分かりやすく説明されています。

#### Serverless AppSync Plugin のインストール

プラグインを yarn インストールします。

```
$ yarn add serverless-appsync-plugin
```

npm を使用しても良いですが、yarn が推奨されています。

```
$ npm install serverless-appsync-plugin
```

#### プラグインの設定

serverless.yml にプラグインを追加します。

```serverless.yml
plugins:
  - serverless-webpack
  - serverless-appsync-plugin # これを追加
```

custom 配下に appSync の設定を記載します。必要最小限しか説明していないので、詳しくは[公式ドキュメント](https://github.com/sid88in/serverless-appsync-plugin#configuring-the-plugin)を参照ください。

```serverless.yml
custom:
  dynamodb:
    stages:
      - dev
      - stg
      - prod
    start:
      port: 8000
      inMemory: true

  appSync:
    # AppSync API の名前
    name: ${opt:stage, self:provider.stage}_taskboard_backend
    # 認証方式　今回は Cognito を使用する
    authenticationType: AMAZON_COGNITO_USER_POOLS
    userPoolConfig:
      awsRegion: ap-northeast-1
      userPoolId: ap-northeast-1_XXXXXXXXX
      defaultAction: ALLOW
    # スキーマファイル　複数指定することも可能
    schema: schema.graphql
    # データソース　今回は DynamoDB と Lambda を使用する
    dataSources:
      - type: AMAZON_DYNAMODB
        name: ${opt:stage, self:provider.stage}_task
        description: タスク管理テーブル
        config:
          tableName: { Ref: Table }
          serviceRoleArn: { Fn::GetAtt: [AppSyncDynamoDBServiceRole, Arn] }
          region: ap-northeast-1
      - type: AWS_LAMBDA
        name: ${opt:stage, self:provider.stage}_appInfo
        description: "Lambda DataSource for appInfo"
        config:
          functionName: appInfo
          iamRoleStatements:
            - Effect: "Allow"
              Action:
                - "lambda:invokeFunction"
              Resource:
                - "*"
    # マッピングテンプレートファイルを格納しているディレクトリ
    mappingTemplatesLocation: mapping-templates
    mappingTemplates:
      # アプリケーションの情報を取得する
      - dataSource: ${opt:stage, self:provider.stage}_appInfo # dataSources で定義したデータソース名を指定
        type: Query
        field: appInfo
        request: Query.appInfo.request.vtl
        response: Query.appInfo.response.vtl
      # タスク情報を１件取得する
      - type: Query
        field: getTask
        kind: PIPELINE # AppSync の関数を使ってパイプラインリゾルバを使う場合
        request: "start.vtl"
        response: "end.vtl"
        functions:
          - getTask # functionConfigurations で定義した関数名を指定
      # タスク情報を複数件取得する
      - dataSource: ${opt:stage, self:provider.stage}_task
        type: Query
        field: listTasks
        request: "Query.listTasks.request.vtl"
        response: "Query.listTasks.response.vtl"
      # タスク情報を作成する
      - dataSource: ${opt:stage, self:provider.stage}_task
        type: Mutation
        field: createTask
        request: "Mutation.createTask.request.vtl"
        response: "end.vtl"
      # タスク情報を更新する
      - dataSource: ${opt:stage, self:provider.stage}_task
        type: Mutation
        field: updateTask
        request: "Mutation.updateTask.request.vtl"
        response: "end.vtl"
      # タスク情報を削除する
      - dataSource: ${opt:stage, self:provider.stage}_task
        type: Mutation
        field: deleteTask
        request: "Mutation.deleteTask.request.vtl"
        response: "end.vtl"
    # AppSync の関数
    functionConfigurations:
      - dataSource: ${opt:stage, self:provider.stage}_task
        name: "getTask"
        request: "getTask.request.vtl"
        response: "getTask.response.vtl"

# Lambda Function は通常の Serverless Framework の使い方と一緒
functions:
  appInfo:
    handler: src/functions/handler.appInfo
    name: ${opt:stage, self:provider.stage}_appInfo

resources:
  Resources:
    Table:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: ${opt:stage, self:provider.stage}_task
        AttributeDefinitions:
          - AttributeName: id
            AttributeType: S
          - AttributeName: status
            AttributeType: S
        KeySchema:
          - AttributeName: id
            KeyType: HASH
          - AttributeName: status
            KeyType: RANGE
        ProvisionedThroughput:
          ReadCapacityUnits: 5
          WriteCapacityUnits: 5
    # AppSync が DynamoDB を操作できるロール
    AppSyncDynamoDBServiceRole:
      Type: "AWS::IAM::Role"
      Properties:
        RoleName: ${opt:stage, self:provider.stage}-appsync-dynamodb-role
        AssumeRolePolicyDocument:
          Version: "2012-10-17"
          Statement:
            - Effect: "Allow"
              Principal:
                Service:
                  - "appsync.amazonaws.com"
              Action:
                - "sts:AssumeRole"
        Policies:
          - PolicyName: "dynamo-policy"
            PolicyDocument:
              Version: "2012-10-17"
              Statement:
                - Effect: "Allow"
                  Action:
                    - "dynamodb:Query"
                    - "dynamodb:BatchWriteItem"
                    - "dynamodb:GetItem"
                    - "dynamodb:DeleteItem"
                    - "dynamodb:PutItem"
                    - "dynamodb:Scan"
                    - "dynamodb:UpdateItem"
                  Resource:
                    - "*"
```

schema.graphql および、mapping-templates は以下のとおりです（コード量が多いので折りたたんでいます）。サンプルソース全体は [こちらの GitHub リポジトリ](https://github.com/daisuke-awaji/taskboard-backend)を参照ください。

<details>
  <summary>schema.graphql と mapping-templates 配下の VTL ファイル</summary>
  <div>

```schema.graphql
type AppInfo {
  name: String!
  version: String!
}

type Task {
  id: ID!
  name: String!
  status: String!
}

type Query {
  appInfo: AppInfo
  getTask(id: ID!, status: String!): Task
  listTasks(
    filter: ModelTaskFilterInput
    limit: Int
    nextToken: String
  ): ListTasks
}

input ModelTaskFilterInput {
  id: ModelIDInput
  name: ModelStringInput
  and: [ModelTaskFilterInput]
  or: [ModelTaskFilterInput]
  not: ModelTaskFilterInput
}

type ListTasks {
  tasks: [Task]
  nextToken: String
}

type Mutation {
  createTask(input: CreateTaskInput!, condition: ModelTaskConditionInput): Task
  updateTask(input: UpdateTaskInput!, condition: ModelTaskConditionInput): Task
  deleteTask(input: DeleteTaskInput!, condition: ModelTaskConditionInput): Task
}

input CreateTaskInput {
  id: ID
  name: String!
  status: String!
}

input UpdateTaskInput {
  id: ID!
  name: String
  status: String
}

input DeleteTaskInput {
  id: ID!
  status: String!
}

input ModelTaskConditionInput {
  name: ModelStringInput
  and: [ModelTaskConditionInput]
  or: [ModelTaskConditionInput]
  not: ModelTaskConditionInput
}

# 以下、AppSyncとDynamoDBで使用可能な GraphQL Schema の共通定義
input ModelIDInput {
  ne: ID
  eq: ID
  le: ID
  lt: ID
  ge: ID
  gt: ID
  contains: ID
  notContains: ID
  between: [ID]
  beginsWith: ID
  attributeExists: Boolean
  attributeType: ModelAttributeTypes
  size: ModelSizeInput
}

enum ModelAttributeTypes {
  binary
  binarySet
  bool
  list
  map
  number
  numberSet
  string
  stringSet
  _null
}

input ModelBooleanInput {
  ne: Boolean
  eq: Boolean
  attributeExists: Boolean
  attributeType: ModelAttributeTypes
}

input ModelFloatInput {
  ne: Float
  eq: Float
  le: Float
  lt: Float
  ge: Float
  gt: Float
  between: [Float]
  attributeExists: Boolean
  attributeType: ModelAttributeTypes
}

input ModelIntInput {
  ne: Int
  eq: Int
  le: Int
  lt: Int
  ge: Int
  gt: Int
  between: [Int]
  attributeExists: Boolean
  attributeType: ModelAttributeTypes
}

input ModelSizeInput {
  ne: Int
  eq: Int
  le: Int
  lt: Int
  ge: Int
  gt: Int
  between: [Int]
}

enum ModelSortDirection {
  ASC
  DESC
}

input ModelStringInput {
  ne: String
  eq: String
  le: String
  lt: String
  ge: String
  gt: String
  contains: String
  notContains: String
  between: [String]
  beginsWith: String
  attributeExists: Boolean
  attributeType: ModelAttributeTypes
  size: ModelSizeInput
}
```

```getTask.request.vtl
{
    "version": "2018-05-29",
    "operation": "GetItem",
    "key": {
        "id": $util.dynamodb.toDynamoDBJson($ctx.args.id),
        "status": $util.dynamodb.toDynamoDBJson($context.args.status)
    }
}
```

```getTask.response.vtl
$util.toJson($ctx.result)
```

  </div>
</details>

#### デプロイ

あとはいつも通り、`serverless deploy` コマンドでリソースを構築します。

```
$ serverless deploy
```

## AppSync をテストする

Serverless Framework を使用して AppSync をデプロイできました。次はテストです。もちろん、AWS 上にデプロイした AppSync に対して Query を実行したり、Mutation を実行してデータを登録しても良いでしょう。ただしその場合、チーム開発は非常に難しくなります。データを共有しなければいけなくなりますし、そもそもユニットテストのようなものは書けません。Web 開発において私たちはこの課題をどう解決するかを知っています。**ローカルで AppSync, DynamoDB, Lambda を起動し、データを登録し、API を実行してデータを取得** できる環境を用意すれば良いのです。

### Serverless AppSync Simulator

Amplify CLI はローカルで AppSync を起動するシミュレータを提供しています。

[新機能 – Amplify CLI を使用したローカルモックとテスト](https://aws.amazon.com/jp/blogs/news/new-local-mocking-and-testing-with-the-amplify-cli/)

```
$ amplify mock api
```

というコマンドを実行すると、ローカル環境に AppSync の API エンドポイント（シミュレータ）と、GrapiQl が起動します。

この機能は内部的には [amplify-appsync-simulator](https://github.com/aws-amplify/amplify-cli/tree/master/packages/amplify-appsync-simulator)
というパッケージを使用しています。これをラップする形で [serverless-appsync-simulator](https://github.com/bboure/serverless-appsync-simulator) という Serverless Framework のプラグインが公開されているので、こちらを使用します。

<a href="https://github.com/bboure/serverless-appsync-simulator"><img src="https://github-link-card.s3.ap-northeast-1.amazonaws.com/bboure/serverless-appsync-simulator.png" width="460px"></a>

#### 使用方法

DynamoDB リゾルバーを使用する場合、DynamoDB をローカルで立ち上げるので、`serverless-dynamodb-local` プラグインも必要になります。
serverless.yml には以下のように記述しましょう。

```serverless.yml
plugins:
  - serverless-webpack
  - serverless-appsync-plugin
  - serverless-dynamodb-local
  - serverless-appsync-simulator # serverless-offline よりも上に記述する必要があります
  - serverless-offline
```

Lambda Resolver のために、Lambda Function を実装します。Webpack を使用して nodejs あるいは TypeScript のソースをコンパイルする場合、 ビルド済みのファイルが ./webpack/service に展開されます。以下の設定を忘れないようにしましょう。

```serverless.yml
custom:
  appsync-simulator:
    location: ".webpack/service"
```

起動するには以下のコマンドを使用します。package.json に [npm-scripts](https://docs.npmjs.com/misc/scripts) を登録しておくと便利です。

```bash
$ sls offline start
```

起動すると、以下のようなログが出力されます。

```
...
Serverless: AppSync endpoint: http://localhost:20002/graphql
Serverless: GraphiQl: http://localhost:20002
...
```

早速ローカルで起動した GrapiQl の画面を開いてみましょう。１回のリクエストで複数のリゾルバーが起動し、レスポンスを返却していることがわかります。

![grapiqllocalhost.gif](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/163591/18c7e38e-7935-41ca-2015-82832a2150b6.gif)

### GraphQL リクエストをテストする

ローカルで AppSync のシミュレータを起動できたので、テストを記述していきます。テストのアプローチの方法は至極単純です。

1. DynamoDB にデータを用意し
1. GraphQL リクエストを実行すると
1. 想定通りの結果が取得できること

を確認します。

#### GraphQL リクエストのテスト領域

テストの対象を図示すると以下のようになります。GrqphQL のリクエストとレスポンスをテストします。これはインテグレーションテストに相当します。

![openapi-インテグレーションテスト.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/163591/4be667af-08fe-57ee-a151-71e6c2847730.png)

#### DynamoDB Local の seed データ

[serverless-dynamodb-local](https://github.com/99xt/serverless-dynamodb-local) には seed データを作成する機能があります。この機能を利用してもいいですね。

以下のように serverless.yml に追記します。

```serverless.yml
custom:
  dynamodb:
    stages:
      - dev
    start:
      port: 8000
      inMemory: true
      migrate: true # DynamoDB Local 起動時にテーブルを作成する
      seed: true # DynamoDB Local 起動時にシードデータを挿入する
    seed:
      dev:
        sources:
          - table: ${self:provider.stage}_task # dev_task というテーブル名を想定している
            sources: [./migrations/tasks.json]
```

`migrations/tasks.json` には以下のように記述しておくことで、DynamoDB Local が起動した際にデータが自動的に挿入されます。

```migrations/tasks.json
[
  {
    "id": "1",
    "name": "掃除をする",
    "status": "NoStatus"
  },
  {
    "id": "2",
    "name": "選択をする",
    "status": "InProgress"
  },
  {
    "id": "3",
    "name": "宿題をする",
    "status": "Done"
  }
]
```

#### Jest を使用してテストを行う

Jest を使用してテストを記述します。Cognito UserPool を使用している場合、リクエスト時に Authorization ヘッダーが必要です。ローカルで動かす際には形式さえ合っていればなんでも良いようです。API キーを必要としている場合は `x-api-key` というヘッダーを指定する必要があります。

```graphql-operation.test.ts
import { GraphQLClient, gql } from "graphql-request";
import { getTask } from "./query";
import { createTask, deleteTask } from "./mutation";

const client = new GraphQLClient("http://localhost:20002/graphql", {
  headers: {
    // format さえ合っていればなんでもいいようです
    Authorization:
      "euJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3ZDhjYTUyOC00OTMxLTQyNTQtOTI3My1lYTVlZTg1M2YyNzEiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiaXNzIjoiaHR0cHM6Ly9jb2duaXRvLWlkcC51cy1lYXN0LTEuYW1hem9uYXdzLmNvbS91cy1lYXN0LTFfZmFrZSIsInBob25lX251bWJlcl92ZXJpZmllZCI6dHJ1ZSwiY29nbml0bzp1c2VybmFtZSI6InVzZXIxIiwiYXVkIjoiMmhpZmEwOTZiM2EyNG12bTNwaHNrdWFxaTMiLCJldmVudF9pZCI6ImIxMmEzZTJmLTdhMzYtNDkzYy04NWIzLTIwZDgxOGJkNzhhMSIsInRva2VuX3VzZSI6ImlkIiwiYXV0aF90aW1lIjoxOTc0MjY0NDEyLCJwaG9uZV9udW1iZXIiOiIrMTIwNjIwNjIwMTYiLCJleHAiOjE1OTY5NDE2MjkwLCJpYXQiOjE1NjQyNjQ0MTMsImVtYWlsIjoidXNlckBkb21haW4uY29tIn0.mKvvVDRN07IvChh1uHloKz5NdUe2bRu6fyPOpzVbE_M",
  },
});

describe("dynamodb resolver", () => {
  test("createTask / getTask by id and status / deleteTask", async () => {
    const valiables = {
      id: "123456789",
      name: "新しいタスク",
      status: "NoStatus",
    };

    // 新規にデータを作成する
    const created = await client.request(createTask, valiables);
    expect(created).toStrictEqual({ createTask: valiables });

    // 作成したデータが取得できる
    const got = await client.request(getTask, {
      id: valiables.id,
      status: valiables.status,
    });
    expect(got.getTask).toEqual(valiables);

    // データが削除できる
    const deleted = await client.request(deleteTask, {
      id: valiables.id,
      status: valiables.status,
    });
    expect(deleted).toStrictEqual({ deleteTask: valiables });
  });
});
```

ちなみに、データ作成・削除のミューテーションおよび、タスクデータを取得するクエリは以下のように作成しています。フロントエンドで使用できるように、クエリ、ミューテーション、サブスクリプションのソースはライブラリとして開発しておくとベターでしょう。

```mutation.ts
import { gql } from "graphql-request";

export const createTask = gql`
  mutation create($id: ID!, $name: String!, $status: String!) {
    createTask(input: { id: $id, name: $name, status: $status }) {
      id
      name
      status
    }
  }
`;

export const deleteTask = gql`
  mutation delete($id: ID!, $status: String!) {
    deleteTask(input: { id: $id, status: $status }) {
      id
      name
      status
    }
  }
`;
```

```query.ts
import { gql } from "graphql-request";

export const getTask = gql`
  query getTask($id: ID!, $status: String!) {
    getTask(id: $id, status: $status) {
      id
      name
      status
    }
  }
`;
```

### VTL をテストする

AppSync は各リゾルバーにリクエスト処理を流す際に VTL(Velocity Template Language) を使用してクライアントからの GraphQL リクエストを、データソースへのリクエストに変換します。
認可処理（Cognito の UserGroup が Admin だったら実行できるようにするなど）、入力パラメータのバリデーション、パラメータの変換処理（大文字にするなど）など様々なビジネスロジックを VTL に記述することになります。この VTL ファイルが AppSync のサーバサイドの機能（関数）という位置付けになります。

#### VTL テストの領域

**GraphQL リクエストをテストする**方法はインテグレーションテストのレイヤーでした。クライアントからのリクエストとレスポンスを検証するため、複雑な VTL を記述した場合、テストの網羅性を担保することが難しくなります。

**VTL 単体でのユニットテスト**を検討しましょう。
テストの対象を図示すると以下のようになります。GrqphQL のリクエストとそれによって生成されるリゾルバーリクエストを検証します。

![openapi-ユニットテスト.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/163591/7c2a0dea-1583-d8c1-1c29-df2899954858.png)

#### VTL のテストのためにヘルパー関数を作成する

VTL によって生成されるリゾルバーリクエストを検証するために、以下のようなヘルパー関数を用意しておきます。`amplify-velocity-template` 本体が提供している `Compile` などを使用します。

```vtl.helper.ts
import * as fs from "fs";
import * as path from "path";
import { Compile, parse } from "amplify-velocity-template";
import { map } from "amplify-appsync-simulator/lib/velocity/value-mapper/mapper";
import * as utils from "amplify-appsync-simulator/lib/velocity/util";

/**
 * VTLファイル内で展開される context を作成する
 */
const createVtlContext = <T>(args: T) => {
  const util = utils.create([], new Date(Date.now()), Object());
  const context = {
    args,
    arguments: args,
  };
  return {
    util,
    utils: util,
    ctx: context,
    context,
  };
};

/**
 * 指定パスのファイルを参照し、入力パラメータをもとに、vtlファイルによりマッピングされたリゾルバリクエストJSONをロードする
 */
const vtlLoader = (filePath: string, args: any) => {
  const vtlPath = path.resolve(__dirname, filePath);
  const vtl = parse(fs.readFileSync(vtlPath, { encoding: "utf8" }));
  const compiler = new Compile(vtl, { valueMapper: map, escape: false });
  const context = createVtlContext(args);
  const result = JSON.parse(compiler.render(context));
  return result;
};
```

#### VTL テストを実行する

まずはシンプルな `getTask.request.vtl` というファイルをテストする方法を考えます。このファイルは入力値を元に DynamoDB に対して `id` と `status` という一意なキー検索を行うリクエストを発行します（id はプライマリーキー、status はソートキー）

```json:getTask.request.vtl
{
  "version": "2018-05-29",
  "operation": "GetItem",
  "key": {
    "id": $util.dynamodb.toDynamoDBJson($ctx.args.id),
    "status": $util.dynamodb.toDynamoDBJson($context.args.status)
  }
}
```

`getTask.request.vtl` のテストです。GraphQL リクエストの引数を args として与え、生成されるリゾルバーリクエストの JSON を検証しています。

```getTask.resolver.test.ts
test("getTask.request.vtl", () => {
  const args = {
    id: "000",
    status: "InProgress",
  };
  const result = vtlLoader("../mapping-templates/getTask.request.vtl", args);
  expect(result).toStrictEqual({
    version: "2018-05-29",
    operation: "GetItem",
    key: {
      id: { S: "000" },
      status: { S: "InProgress" },
    },
  });
});
```

ID 指定で１件取得するリゾルバーはシンプルすぎますね。次に `Mutation.createTask.req.vtl` をみていきましょう。これは指定したパラメータをもとに、１件データを登録する処理です。

```Mutation.createTask.req.vtl
## [Start] Prepare DynamoDB PutItem Request. **
$util.qr($context.args.input.put("createdAt", $util.defaultIfNull($ctx.args.input.createdAt, $util.time.nowISO8601())))
$util.qr($context.args.input.put("updatedAt", $util.defaultIfNull($ctx.args.input.updatedAt, $util.time.nowISO8601())))
$util.qr($context.args.input.put("__typename", "Task"))

#set( $condition = {
  "expression": "attribute_not_exists(#id)",
  "expressionNames": {
      "#id": "id"
  }
} )
#if( $context.args.condition )
  #set( $condition.expressionValues = {} )
  #set( $conditionFilterExpressions = $util.parseJson($util.transform.toDynamoDBConditionExpression($context.args.condition)) )
  $util.qr($condition.put("expression", "($condition.expression) AND $conditionFilterExpressions.expression"))
  $util.qr($condition.expressionNames.putAll($conditionFilterExpressions.expressionNames))
  $util.qr($condition.expressionValues.putAll($conditionFilterExpressions.expressionValues))
#end

#if( $condition.expressionValues && $condition.expressionValues.size() == 0 )
  #set( $condition = {
  "expression": $condition.expression,
  "expressionNames": $condition.expressionNames
} )
#end

{
  "version": "2017-02-28",
  "operation": "PutItem",
  "key": {
    "id":   $util.dynamodb.toDynamoDBJson($util.defaultIfNullOrBlank($ctx.args.input.id, $util.autoId())),
    "status": $util.dynamodb.toDynamoDBJson($context.args.input.status)
  },
  "attributeValues": $util.dynamodb.toMapValuesJson($context.args.input),
  "condition": $util.toJson($condition)
}
## [End] Prepare DynamoDB PutItem Request. **
```

複雑になってきました。入力として `condition`（条件）を与えていたり、DynamoDB に登録する前処理として `createdAt` や `updatedAt` などのフィールドを追加しています。このような複雑なロジックが組み込まれた VTL を単体でユニットテストできるのは非常に効果的です。

以下テストコードで、`createdAt` や `updatedAt` などのフィールドが正常に追加されているか確認します。※ 現在時刻が設定されるので `expect.anything()` を使用して曖昧な判定にしています。

```createTask.resolver.test.ts
test("Mutation.createTask.req.vtl / expect attributeValues: createdAt, updateAt etc...", () => {
  const args = {
    input: {
      id: "001",
      name: "study",
      status: "InProgress",
    },
  };
  const result = vtlLoader("../mapping-templates/Mutation.createTask.req.vtl", args);
  expect(result).toEqual({
    version: "2017-02-28",
    operation: "PutItem",
    key: {
      id: { S: "001" },
      status: { S: "InProgress" },
    },
    attributeValues: {
      __typename: {
        S: "Task",
      },
      createdAt: {
        S: expect.anything(),
      },
      id: {
        S: "001",
      },
      name: {
        S: "study",
      },
      status: {
        S: "InProgress",
      },
      updatedAt: {
        S: expect.anything(),
      },
    },
    condition: {
      expression: "attribute_not_exists(#id)",
      expressionNames: {
        "#id": "id",
      },
    },
  });
```

## CircleCI を使用してテストする

これまで実装してきたことを CircleCI 上で実行します。
CircleCI の最大の魅力である orbs を使いましょう。serverless-framework-orb が使用できます。

<a href="https://github.com/CircleCI-Public/serverless-framework-orb"><img src="https://github-link-card.s3.ap-northeast-1.amazonaws.com/CircleCI-Public/serverless-framework-orb.png" width="460px"></a>

[CircleCI ドキュメント](https://circleci.com/orbs/registry/orb/circleci/serverless-framework)

ただし、今回使用する DynamoDB Local は Java 製なので、ちょっと工夫が必要です。この orbs で使用される Docker イメージには nodejs, Python しか入っていないので Java をインストールしましょう。OpenJDK が入れられれば十分です。

`.circleci/config.yml` は以下のようになります。

```.circleci/config.yml
version: 2.1

orbs:
  aws-cli: circleci/aws-cli@1.0
  serverless: circleci/serverless-framework@1.0

jobs:
  build:
    docker:
      - image: circleci/node:12
    steps:
      - checkout
      - run:
          name: install dependencies
          command: yarn install
  test:
    executor: serverless/default
    steps:
      - checkout
      - run:
          name: apt update
          command: sudo apt update
      - run:
          name: apt install java
          command: sudo apt install openjdk-8-jdk
      - run:
          name: install dependencies
          command: yarn install
      - run:
          name: setup for dynamodb local
          command: yarn sls:setup
      - run:
          name: unit test
          command: yarn ci
workflows:
  version: 2
  build_and_test:
    jobs:
      - build
      - test
```

`package.json` の npm-scripts はこのように記述しています。

```package.json
"scripts": {
  "sls:setup": "sls dynamodb install",
  "start": "sls offline start",
  "test": "jest",
  "start-server": "yarn start",
  "ci": "start-server-and-test start-server http://localhost:20002 test"
},
```

AppSync Simulator の起動を待つ必要があるため、`start-server-and-test` を使用しています。このライブラリを使用することで、http でリクエストを受け付けるサービスが起動したことを検知して、次の処理を実行できます。この仕組みを利用して、以下の一連の流れを実施します。

1. AppSync Simulator を起動する。
2. テストを実行する。
3. AppSync Simulator を停止する。

<a href="https://github.com/bahmutov/start-server-and-test"><img src="https://github-link-card.s3.ap-northeast-1.amazonaws.com/bahmutov/start-server-and-test.png" width="460px"></a>

## デリバリの戦略

今回デリバリする対象の環境は `dev`, `stg`, `prod` の３つとします。
それぞれ以下のような用途を想定しています。

- dev: テスト環境
- stg: ステージング環境（本番環境と同等のスペック）
- prod: 本番環境

以下のようにステージごとに参照できる変数を定義します。

```serverless.yml
custom:
  stages:
    dev:
      userPoolId: ap-northeast-1_XXXXXXXXX
    stg:
      userPoolId: ap-northeast-1_YYYYYYYYY
    prod:
      userPoolId: ap-northeast-1_ZZZZZZZZZ
```

以下のように参照して使用できます。

```serverless.yml
userPoolId: ${self:custom.stages.${opt:stage}.userPoolId}
```

このようにしておくことで、ステージを指定してことなるパラメータを読み込み、デプロイできるようになります。

```
$ sls deploy --stage dev
```

CloudForamtion マネジメントコンソール画面
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/163591/417e65e2-94d2-5c96-7e65-0e682e3caabf.png)

AppSync マネジメントコンソール画面
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/163591/f46e49ad-489f-3507-bc40-308f3f0145c7.png)

複数環境にデプロイできています。実際のユースケースでは、本番環境だけ AWS 環境を分離しておくという方法を採用するかもしれません。その場合は [@kudedasumn](https://qiita.com/kuedasmn)さんの「[CircleCI で複数の AWS アカウントを扱う方法](https://qiita.com/kuedasmn/items/cac2c0bd2f5092bb033f)」という記事が大変参考になります。

## まとめ

AppSync をローカルで開発し、テストする。また、CircleCI 上でテストを行い、複数の環境にデプロイする方法を説明しました。AppSync をはじめとし、GraphQL はモバイルや IoT など、すべてのデバイスがインターネットに接続し、相互作用する現代のアプリケーションにおいて必須ともいえる技術要素です。これからも GraphQL 関連のエコシステムは継続的にウォッチし、コミットしていきたいですね。

---

Speakerdeck に資料を掲載しました。
https://speakerdeck.com/gawa/effective-appsync
