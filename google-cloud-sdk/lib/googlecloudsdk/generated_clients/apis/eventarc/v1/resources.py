# -*- coding: utf-8 -*- #
# Copyright 2023 Google LLC. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""Resource definitions for Cloud Platform Apis generated from apitools."""

import enum


BASE_URL = 'https://eventarc.googleapis.com/v1/'
DOCS_URL = 'https://cloud.google.com/eventarc'


class Collections(enum.Enum):
  """Collections for all supported apis."""

  PROJECTS = (
      'projects',
      'projects/{projectsId}',
      {},
      ['projectsId'],
      True
  )
  PROJECTS_LOCATIONS = (
      'projects.locations',
      '{+name}',
      {
          '':
              'projects/{projectsId}/locations/{locationsId}',
      },
      ['name'],
      True
  )
  PROJECTS_LOCATIONS_CHANNELCONNECTIONS = (
      'projects.locations.channelConnections',
      '{+name}',
      {
          '':
              'projects/{projectsId}/locations/{locationsId}/'
              'channelConnections/{channelConnectionsId}',
      },
      ['name'],
      True
  )
  PROJECTS_LOCATIONS_CHANNELS = (
      'projects.locations.channels',
      '{+name}',
      {
          '':
              'projects/{projectsId}/locations/{locationsId}/channels/'
              '{channelsId}',
      },
      ['name'],
      True
  )
  PROJECTS_LOCATIONS_ENROLLMENTS = (
      'projects.locations.enrollments',
      '{+name}',
      {
          '':
              'projects/{projectsId}/locations/{locationsId}/enrollments/'
              '{enrollmentsId}',
      },
      ['name'],
      True
  )
  PROJECTS_LOCATIONS_GOOGLEAPISOURCES = (
      'projects.locations.googleApiSources',
      '{+name}',
      {
          '':
              'projects/{projectsId}/locations/{locationsId}/'
              'googleApiSources/{googleApiSourcesId}',
      },
      ['name'],
      True
  )
  PROJECTS_LOCATIONS_KAFKASOURCES = (
      'projects.locations.kafkaSources',
      '{+name}',
      {
          '':
              'projects/{projectsId}/locations/{locationsId}/kafkaSources/'
              '{kafkaSourcesId}',
      },
      ['name'],
      True
  )
  PROJECTS_LOCATIONS_MESSAGEBUSES = (
      'projects.locations.messageBuses',
      '{+name}',
      {
          '':
              'projects/{projectsId}/locations/{locationsId}/messageBuses/'
              '{messageBusesId}',
      },
      ['name'],
      True
  )
  PROJECTS_LOCATIONS_OPERATIONS = (
      'projects.locations.operations',
      '{+name}',
      {
          '':
              'projects/{projectsId}/locations/{locationsId}/operations/'
              '{operationsId}',
      },
      ['name'],
      True
  )
  PROJECTS_LOCATIONS_PIPELINES = (
      'projects.locations.pipelines',
      '{+name}',
      {
          '':
              'projects/{projectsId}/locations/{locationsId}/pipelines/'
              '{pipelinesId}',
      },
      ['name'],
      True
  )
  PROJECTS_LOCATIONS_PROVIDERS = (
      'projects.locations.providers',
      '{+name}',
      {
          '':
              'projects/{projectsId}/locations/{locationsId}/providers/'
              '{providersId}',
      },
      ['name'],
      True
  )
  PROJECTS_LOCATIONS_TRIGGERS = (
      'projects.locations.triggers',
      '{+name}',
      {
          '':
              'projects/{projectsId}/locations/{locationsId}/triggers/'
              '{triggersId}',
      },
      ['name'],
      True
  )

  def __init__(self, collection_name, path, flat_paths, params,
               enable_uri_parsing):
    self.collection_name = collection_name
    self.path = path
    self.flat_paths = flat_paths
    self.params = params
    self.enable_uri_parsing = enable_uri_parsing
