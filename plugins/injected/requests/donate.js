const { camelizeKeys } = require('humps')
const { create: createAxios } = require('axios')

const baseUrl = process.browser ? `//${location.host}` : process.env.BASE_URL

const publicApi = createAxios({
  baseURL: `${baseUrl}/api/public`,
  timeout: 20000,
})

function createPost(requestUrl) {
  return async function (params = {}) {
    try {
      const { data } = await publicApi.post(requestUrl, params)
      return camelizeKeys(data).items
    } catch ({ response = {}, message }) {
      // eslint-disable-next-line no-console
      console.error(`
      ApiError:
        url: ${requestUrl}
        message: ${message}
        data: ${response.data ?? ''}
    `)
      throw new Error(message)
    }
  }
}

async function postDonate(params = {}) {
  return await createPost(`${baseUrl}/api/donate`)(params)
}
async function postSubscribe(params = {}) {
  return await createPost(`${baseUrl}/api/subscriptions`)(params)
}

Object.assign(module.exports, {
  postDonate,
  postSubscribe,
})
