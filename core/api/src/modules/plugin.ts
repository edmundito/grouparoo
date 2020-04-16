import { api, log } from "actionhero";
import { GrouparooPlugin } from "../classes/plugin";
import { Setting } from "../models/Setting";
import { File } from "../models/File";
import { Profile } from "../models/Profile";
import { Group } from "../models/Group";
import { GroupMember } from "../models/GroupMember";
import { Source } from "../models/Source";
import { Schedule } from "../models/Schedule";
import { Destination } from "../models/Destination";
import { DestinationGroup } from "../models/DestinationGroup";
import { Run } from "../models/Run";
import { App } from "../models/App";
import { Import } from "../models/Import";
import { ProfileProperty } from "../models/ProfileProperty";
import { ProfilePropertyRule } from "../models/ProfilePropertyRule";
import { Log } from "../models/Log";
import { Team } from "../models/Team";
import { TeamMember } from "../models/TeamMember";
import { ProfileMultipleAssociationShim } from "../models/ProfileMultipleAssociationShim";
import Mustache from "mustache";

// This is needed when running in dev mode (TS) but you are using a compiled plugin (JS).
// The plugin will actually load the JS model while core will be loading the TS model.
// Both need to be "added" to sequelize to know which connection to use.
let modelsMounted = false;
function ensureModelsMounted() {
  if (modelsMounted) {
    return;
  }
  api.sequelize.addModels([
    Setting,
    File,
    Profile,
    Group,
    GroupMember,
    App,
    Source,
    Schedule,
    Destination,
    DestinationGroup,
    Run,
    Import,
    Log,
    ProfileProperty,
    ProfilePropertyRule,
    Team,
    TeamMember,
    ProfileMultipleAssociationShim,
  ]);
  modelsMounted = true;
}

export namespace plugin {
  /**
   * expose models to plugins
   */
  export function models() {
    ensureModelsMounted();

    return {
      Setting,
      File,
      Profile,
      Group,
      GroupMember,
      App,
      Source,
      Schedule,
      Destination,
      DestinationGroup,
      Run,
      Import,
      Log,
      ProfileProperty,
      ProfilePropertyRule,
      Team,
      TeamMember,
    };
  }

  /**
   * Register a Grouparoo Plugin
   */
  export function registerPlugin(plugin: GrouparooPlugin) {
    log(`registering grouparoo plugin: ${plugin.name}`);
    api.plugins.plugins.push(plugin);
  }

  /**
   * Register a setting for your Grouparoo plugin
   */
  export async function registerSetting(
    pluginName: string,
    key: string,
    defaultValue: any,
    description: string
  ) {
    ensureModelsMounted();

    const setting = await Setting.findOne({ where: { pluginName, key } });

    if (setting) {
      return setting;
    }

    try {
      const setting = await Setting.create({
        pluginName,
        key,
        value: defaultValue,
        defaultValue,
        description,
      });

      return setting;
    } catch (error) {
      throw new Error(
        `error registering setting: ${JSON.stringify({
          pluginName,
          key,
          defaultValue,
          description,
        })}: ${error}`
      );
    }
  }

  /**
   * Read a setting for this plugin
   */
  export async function readSetting(pluginName: string, key: string) {
    ensureModelsMounted();

    const setting = await Setting.findOne({ where: { pluginName, key } });
    if (!setting) {
      throw new Error(
        `setting ${key} not registered for grouparoo plugin ${pluginName}`
      );
    }
    return setting;
  }

  /**
   * Update a setting for this plugin
   */
  export async function updateSetting(
    pluginName: string,
    key: string,
    value: any
  ) {
    ensureModelsMounted();

    const setting = await plugin.readSetting(pluginName, key);
    setting.value = value;
    await setting.save();
    return setting;
  }

  /**
   * When your plugin has a record for a profile, send it to this method.  We will use the provided mapping against your raw data row to store the original data and mapped data to the profile.
   * mapping: an object whose keys are remote columns and whose values are the profilePropertyRule keys, ie: {remoteColumnId: 'userId'}
   * row: {email: 'abc@company.com', vip: true}
   */
  export async function createImport(
    mapping: { [remoteKey: string]: string },
    run: Run,
    row: { [remoteKey: string]: any }
  ) {
    ensureModelsMounted();
    const mappingKeys = Object.keys(mapping);
    const mappedProfileProperties = {};
    mappingKeys.forEach((k) => {
      mappedProfileProperties[mapping[k]] = row[k];
    });

    const transaction = await api.sequelize.transaction();

    const _import = await Import.create(
      {
        rawData: row,
        data: mappedProfileProperties,
        creatorType: "run",
        creatorGuid: run.guid,
      },
      { transaction }
    );
    await run.increment(["importsCreated"], { transaction });
    await transaction.commit();

    return _import;
  }

  /**
   * Given a fileGuid, download the file to this server and return the readable local path
   */
  export async function getLocalFilePath(fileGuid: string): Promise<string> {
    ensureModelsMounted();

    const file = await File.findOne({ where: { guid: fileGuid } });

    if (!file) {
      throw new Error(`cannot find a file with guid ${fileGuid}`);
    }

    const { localPath } = await api.files.downloadToServer(file);
    return localPath;
  }

  /**
   * data helpers
   */
  export function expandDates(raw: Date) {
    if (!raw) {
      return null;
    }

    return {
      raw,
      iso: raw.toISOString(),
      sql: raw.toISOString().slice(0, 19).replace("T", " "),
      date: raw.toISOString().split("T")[0],
      time: raw.toISOString().split("T")[1].split(".")[0],
    };
  }

  /**
   * Takes a string with mustache variables and replaces them with the proper values for a schedule and run
   */
  export async function replaceTemplateRunVariables(string: string, run?: Run) {
    const data = {
      now: expandDates(new Date()),
      run: {},
      previousRun: {
        guid: null,
        creatorGuid: null,
        creatorType: null,
        error: null,
        state: "mocked",
        createdAt: expandDates(new Date(0)),
        updatedAt: expandDates(new Date(0)),
      },
    };

    if (run) {
      data.run = {
        guid: run.guid,
        creatorGuid: run.creatorGuid,
        creatorType: run.creatorType,
        state: run.state,
        error: run.error,
        createdAt: expandDates(run.createdAt),
        updatedAt: expandDates(run.updatedAt),
      };

      const previousRun = await run.previousRun();

      if (previousRun) {
        data.previousRun = {
          guid: previousRun.guid,
          creatorGuid: previousRun.creatorGuid,
          creatorType: previousRun.creatorType,
          state: previousRun.state,
          error: previousRun.error,
          createdAt: expandDates(previousRun.createdAt),
          updatedAt: expandDates(previousRun.updatedAt),
        };
      }
    }

    return Mustache.render(string, data);
  }

  /**
   * Takes a string with mustache variables and replaces them with the proper values for a profile
   */
  export async function replaceTemplateProfileVariables(
    string,
    profile: Profile
  ): Promise<string> {
    const data = {
      now: expandDates(new Date()),
      createdAt: expandDates(profile.createdAt),
      updatedAt: expandDates(profile.updatedAt),
    };

    const properties = await profile.properties();

    for (const key in properties) {
      data[key] =
        properties[key].value instanceof Date
          ? expandDates(properties[key].value)
          : properties[key].value;
    }

    return Mustache.render(string, data);
  }
}
