# Harmony API E2E

- 结果：通过
- API_BASE_URL：https://fyeboolnlvqv.sealoshzh.site/api
- 执行步骤：22
- 失败步骤：0

| 步骤 | 方法 | 路径 | 结果 | 状态码 | 说明 |
| --- | --- | --- | --- | --- | --- |
| GET /health | GET | /health | 通过 | 200 | 通过 |
| POST /auth/login | POST | /auth/login | 通过 | 201 | 通过 |
| GET /auth/me | GET | /auth/me | 通过 | 200 | 通过 |
| GET /customers | GET | /customers | 通过 | 200 | 通过 |
| POST /customers | POST | /customers | 通过 | 201 | 通过 |
| GET /products | GET | /products | 通过 | 200 | 通过 |
| POST /products | POST | /products | 通过 | 201 | 通过 |
| PATCH /products/:id | PATCH | /products/:id | 通过 | 200 | 通过 |
| GET /products/:id/documents | GET | /products/:id/documents | 通过 | 200 | 通过 |
| GET /connector-params | GET | /connector-params | 通过 | 200 | 通过 |
| POST /connector-params | POST | /connector-params | 通过 | 201 | 通过 |
| PATCH /connector-params/:id | PATCH | /connector-params/:id | 通过 | 200 | 通过 |
| DELETE /connector-params/:id | DELETE | /connector-params/:id | 通过 | 200 | 通过 |
| POST /connector-params/import-one | POST | /connector-params/import-one | 通过 | 201 | 通过 |
| GET /connector-params/export | GET | /connector-params/export | 通过 | 200 | 通过 |
| GET /recycle-bin | GET | /recycle-bin | 通过 | 200 | 通过 |
| POST /documents/upload PDF | POST | /documents/upload | 通过 | 201 | 通过 |
| GET /documents/:id/preview PDF | GET | /documents/:id/preview | 通过 | 200 | 通过 |
| GET preview page | GET | /documents/:id/preview-pages/:pageNo | 通过 | 200 | 通过 |
| POST /documents/upload PNG | POST | /documents/upload | 通过 | 201 | 通过 |
| GET image preview | GET | /documents/:id/preview | 通过 | 200 | 通过 |
| GET /products/:id/documents final | GET | /products/:id/documents | 通过 | 200 | 通过 |
