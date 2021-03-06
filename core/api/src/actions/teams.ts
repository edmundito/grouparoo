import { Action } from "actionhero";
import { AuthenticatedAction } from "../classes/authenticatedAction";
import { Team } from "../models/Team";
import { TeamMember } from "../models/TeamMember";

export class TeamInitialize extends Action {
  constructor() {
    super();
    this.name = "team:initialize";
    this.description = "create the first team with the first team member";
    this.outputExample = {};
    this.inputs = {
      firstName: { required: true },
      lastName: { required: true },
      password: { required: true },
      email: { required: true },
    };
  }

  async run({ params, response }) {
    let team: Team;
    let teamMember: TeamMember;

    const teamsCount = await Team.count();

    if (teamsCount > 0) {
      throw new Error("an administration team already exists, please sign in");
    }

    team = await Team.create({
      name: "Administrators",
      locked: true,
      permissionAllRead: true,
      permissionAllWrite: true,
    });

    teamMember = await TeamMember.create({
      teamGuid: team.guid,
      email: params.email,
      firstName: params.firstName,
      lastName: params.lastName,
    });

    await teamMember.updatePassword(params.password);

    response.team = await team.apiData();
    response.teamMember = await teamMember.apiData();
  }
}

export class TeamsList extends AuthenticatedAction {
  constructor() {
    super();
    this.name = "teams:list";
    this.description = "list all the teams";
    this.outputExample = {};
    this.permission = { topic: "team", mode: "read" };
    this.inputs = {};
  }

  async run({ response }) {
    const teams = await Team.findAll();
    response.teams = await Promise.all(
      teams.map(async (team) => team.apiData())
    );
  }
}

export class TeamCreate extends AuthenticatedAction {
  constructor() {
    super();
    this.name = "team:create";
    this.description = "create a team";
    this.outputExample = {};
    this.permission = { topic: "team", mode: "write" };
    this.inputs = {
      name: { required: true },
      permissionAllRead: { required: false, default: true },
      permissionAllWrite: { required: false, default: false },
    };
  }

  async run({ params, response }) {
    const team = new Team(params);
    await team.save();
    response.team = await team.apiData();
  }
}

export class TeamEdit extends AuthenticatedAction {
  constructor() {
    super();
    this.name = "team:edit";
    this.description = "edit a team";
    this.outputExample = {};
    this.permission = { topic: "team", mode: "write" };
    this.inputs = {
      guid: { required: true },
      name: { required: false },
      permissionAllRead: { required: false },
      permissionAllWrite: { required: false },
      disabledPermissionAllRead: { required: false },
      disabledPermissionAllWrite: { required: false },
      permissions: { required: false },
    };
  }

  async run({ params, response }) {
    const team = await Team.findByGuid(params.guid);
    const updateParams = Object.assign({}, params);
    if (params.disabledPermissionAllRead) {
      updateParams.permissionAllRead = null;
    }
    if (params.disabledPermissionAllWrite) {
      updateParams.permissionAllWrite = null;
    }

    await team.update(updateParams);

    let permissions = params.permissions;
    if (permissions) {
      try {
        permissions = JSON.parse(permissions);
      } catch (error) {}

      await team.setPermissions(permissions);
    }

    response.team = await team.apiData();
  }
}

export class TeamView extends AuthenticatedAction {
  constructor() {
    super();
    this.name = "team:view";
    this.description = "view a team and members";
    this.outputExample = {};
    this.permission = { topic: "team", mode: "read" };
    this.inputs = {
      guid: { required: true },
    };
  }

  async run({ params, response }) {
    const team = await Team.findOne({
      where: { guid: params.guid },
      include: [{ model: TeamMember }],
    });

    if (!team) {
      throw new Error("team not found");
    }

    response.team = await team.apiData();
    response.teamMembers = await Promise.all(
      team.teamMembers.map(async (mem) => {
        return await mem.apiData();
      })
    );
    response.teamMembers.sort((a, b) => {
      if (a.email < b.email) {
        return 1;
      } else {
        return -1;
      }
    });
  }
}

export class TeamDestroy extends AuthenticatedAction {
  constructor() {
    super();
    this.name = "team:destroy";
    this.description = "destroy a team";
    this.outputExample = {};
    this.permission = { topic: "team", mode: "write" };
    this.inputs = {
      guid: { required: true },
    };
  }

  async run({ params, response }) {
    response.success = false;
    const team = await Team.findByGuid(params.guid);
    await team.destroy();
    response.success = true;
  }
}
