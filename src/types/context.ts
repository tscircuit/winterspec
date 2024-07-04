import {
  WinterSpecCustomResponse,
  WinterSpecJsonResponse,
  WinterSpecMultiPartFormDataResponse,
  WinterSpecResponse,
  SerializableToResponse,
} from "./web-handler.js"

export type ResponseTypeToContext<
  ResponseType extends SerializableToResponse | Response,
> = Exclude<ResponseType, Response> extends WinterSpecJsonResponse<infer T>
  ? {
      json: typeof WinterSpecResponse.json<T>
    }
  : Exclude<ResponseType, Response> extends WinterSpecMultiPartFormDataResponse<
        infer T
      >
    ? {
        multipartFormData: typeof WinterSpecResponse.multipartFormData<T>
      }
    : Exclude<ResponseType, Response> extends WinterSpecCustomResponse<
          infer T,
          infer C
        >
      ? {
          custom: typeof WinterSpecResponse.custom<T, C>
        }
      : {
          json: typeof WinterSpecResponse.json<unknown>
          multipartFormData: typeof WinterSpecResponse.multipartFormData<
            Record<string, string>
          >
        }

const DEFAULT_CONTEXT = {
  json: WinterSpecResponse.json,
  multipartFormData: WinterSpecResponse.multipartFormData,
  custom: WinterSpecResponse.custom,
} as const

export const getDefaultContext = () => ({ ...DEFAULT_CONTEXT })
