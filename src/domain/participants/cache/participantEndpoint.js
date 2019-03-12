/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.
 * Gates Foundation
 * Name Surname <name.surname@gatesfoundation.com>

 * Shashikant Hirugade <shashikant.hirugade@modusbox.com>
 * Rajiv Mothilal <rajiv.mothilal@modusbox.com>
 --------------
 ******/

'use strict'

const Logger = require('@mojaloop/central-services-shared').Logger
const Config = require('../../../lib/config')
const Catbox = require('catbox')
const {Map} = require('immutable')
const request = require('../../../lib/request')
const util = require('../../../lib/util')
const Enum = require('../../../lib/enum')
const partition = 'endpoint-cache'
const clientOptions = {partition}
const policyOptions = Config.ENDPOINT_CACHE_CONFIG
const Mustache = require('mustache')

let client
let policy

/**
 * @module src/domain/participant/lib/cache
 */

/**
 * @function initializeCache
 *
 * @description This initializes the cache for endpoints
 *
 * @returns {boolean} Returns true on successful initialization of the cache, throws error on falires
 */
const initializeCache = async () => {
  try {
    Logger.info(`participantEndpointCache::initializeCache::start::clientOptions - ${clientOptions}`)
    client = new Catbox.Client(require('catbox-memory'), clientOptions)
    await client.start()
    policyOptions.generateFunc = fetchEndpoints
    Logger.info(`participantEndpointCache::initializeCache::start::policyOptions - ${policyOptions}`)
    policy = new Catbox.Policy(policyOptions, client, partition)
    Logger.info('participantEndpointCache::initializeCache::Cache initialized successfully')
    return true
  } catch (err) {
    Logger.error(`participantEndpointCache::Cache error:: ERROR:'${err}'`)
    throw err
  }
}

/**
 * @function fetchEndpoints
 *
 * @description This populates the cache of endpoints
 *
 * @param {string} fsp The fsp id
 * @returns {object} endpointMap Returns the object containing the endpoints for given fsp id
 */

const fetchEndpoints = async (fsp) => {
  try {
    Logger.info(`[fsp=${fsp}] ~ participantEndpointCache::fetchEndpoints := Refreshing the cache for FSP: ${fsp}`)
    const defaultHeaders = util.defaultHeaders(Enum.apiServices.CL, Enum.resources.participants, Enum.apiServices.ALS)
    const url = Mustache.render(Config.ENDPOINT_SOURCE_URL, { fsp })
    const response = await request.sendRequest(url, defaultHeaders)
    Logger.info(`[fsp=${fsp}] ~ Model::participantEndpoint::getEndpoint := successful with body: ${JSON.stringify(response.body)}`)
    let endpoints = JSON.parse(response.body)
    let endpointMap = {}
    if (Array.isArray(endpoints)) {
      endpoints.forEach(item => {
        endpointMap[item.type] = item.value
      })
    }
    Logger.info(`[fsp=${fsp}] ~ participantEndpointCache::fetchEndpoints := Returning the endpoints: ${JSON.stringify(endpointMap)}`)
    return endpointMap
  } catch (e) {
    Logger.error(`participantEndpointCache::fetchEndpoints:: ERROR:'${e}'`)
  }
}

/**
 * @function GetEndpoint
 *
 * @description It returns the endpoint for a given fsp and type from the cache if the cache is still valid, otherwise it will refresh the cache and return the value
 *
 * @param {string} fsp - the id of the fsp
 * @param {string} endpointType - the type of the endpoint
 *
 * @returns {string} - Returns the endpoint, throws error if failure occurs
 */
const getEndpoint = async (fsp, endpointType) => {
  Logger.info(`participantEndpointCache::getEndpoint::enpointType - ${endpointType}`)
  try {
    let endpoints = await policy.get(fsp)
    return new Map(endpoints).get(endpointType)
  } catch (e) {
    Logger.error(`participantEndpointCache::getEndpoint:: ERROR:'${e}'`)
    throw e
  }
}

// /**
//  * @function stopCache
//  *
//  * @description It stops the cache client
//  *
//  * @returns {boolean} - Returns the status
//  */
// const stopCache = async () => {
//   Logger.info('participantEndpointCache::stopCache::Stopping the cache')
//   return client.stop()
// }

module.exports = {
  initializeCache,
  getEndpoint
  // stopCache
}