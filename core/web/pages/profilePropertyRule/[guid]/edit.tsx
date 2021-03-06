import { useState, useEffect, Fragment } from "react";
import { useApi } from "../../../hooks/useApi";
import { Row, Col, Button, Form, Table, Badge } from "react-bootstrap";
import Router from "next/router";
import Link from "next/link";
import Loader from "../../../components/loader";
import AppIcon from "../../../components/appIcon";
import StateBadge from "../../../components/stateBadge";
import ProfilePreview from "../../../components/profilePropertyRule/profilePreview";
import { Typeahead } from "react-bootstrap-typeahead";
import DatePicker from "../../../components/datePicker";

import Head from "next/head";
import ProfilePropertyRuleTabs from "../../../components/tabs/profilePropertyRule";

import { ProfilePropertyRuleAPIData } from "../../../utils/apiData";

export default function Page(props) {
  const {
    previousPath,
    errorHandler,
    successHandler,
    profilePropertyRulesHandler,
    query,
    types,
    filterOptions,
    pluginOptions,
    profilePropertyRules,
  } = props;
  const { execApi } = useApi(props, errorHandler);
  const [loading, setLoading] = useState(false);
  const [profilePropertyRule, setProfilePropertyRule] = useState<
    ProfilePropertyRuleAPIData
  >(props.profilePropertyRule);
  const [localFilters, setLocalFilters] = useState(
    props.profilePropertyRule.filters
  );

  const { guid } = query;

  useEffect(() => {
    newRuleDefaults();
  }, []);

  async function onSubmit(event) {
    event.preventDefault();
    if (
      window.confirm(
        "Are you sure?  This will also update all profile properties with this key"
      )
    ) {
      setLoading(true);
      const response = await execApi(
        "put",
        `/profilePropertyRule/${guid}`,
        Object.assign({}, profilePropertyRule, {
          filters: localFilters,
          state: "ready",
        })
      );
      setLoading(false);
      if (response?.profilePropertyRule) {
        setProfilePropertyRule(response.profilePropertyRule);
        profilePropertyRulesHandler.set(response.profilePropertyRule);
        if (
          response.profilePropertyRule.state === "ready" &&
          profilePropertyRule.state === "draft"
        ) {
          Router.push(previousPath);
        } else {
          successHandler.set({ message: "Profile Property Rule Updated" });
        }
      }
    }
  }

  async function handleDelete() {
    if (
      window.confirm(
        "Are you sure?  This will also delete all profile properties with this key"
      )
    ) {
      setLoading(true);
      const response = await execApi("delete", `/profilePropertyRule/${guid}`);
      setLoading(false);
      if (response) {
        Router.push(previousPath);
      }
    }
  }

  function newRuleDefaults() {
    if (
      profilePropertyRule.state === "draft" &&
      profilePropertyRule.key === ""
    ) {
      const _profilePropertyRule = Object.assign({}, profilePropertyRule);

      // make the user explicitly choose a type
      _profilePropertyRule.type = "";

      setProfilePropertyRule(_profilePropertyRule);
    }
  }

  const update = async (event) => {
    const _profilePropertyRule = Object.assign({}, profilePropertyRule);
    _profilePropertyRule[event.target.id] =
      event.target.type === "checkbox"
        ? event.target.checked
        : event.target.value;
    setProfilePropertyRule(_profilePropertyRule);
  };

  function updateOption(key, value) {
    const _profilePropertyRule = Object.assign({}, profilePropertyRule);
    _profilePropertyRule.options[key] = value;
    setProfilePropertyRule(_profilePropertyRule);
  }

  function addRule() {
    const ruleLimit = 10;

    const _localFilters = [...localFilters];
    if (_localFilters.length >= ruleLimit) {
      alert(`only ${ruleLimit} rules allowed`);
      return;
    }

    _localFilters.push({
      key: filterOptions[0].key,
      op: filterOptions[0].ops[0],
      match: "",
    });

    setLocalFilters(_localFilters);
  }

  function deleteRule(idx: number) {
    const _localFilters = [...localFilters];
    _localFilters.splice(idx, 1);
    setLocalFilters(_localFilters);
  }

  if (profilePropertyRule.guid === "") {
    return <Loader />;
  }

  let rowChanges = false;

  return (
    <>
      <Head>
        <title>Grouparoo: {profilePropertyRule.key}</title>
      </Head>

      <ProfilePropertyRuleTabs profilePropertyRule={profilePropertyRule} />

      <Form id="form" onSubmit={onSubmit}>
        <Row>
          <Col md={1}>
            <br />
            <AppIcon
              src={profilePropertyRule.source.app.icon}
              fluid
              size={100}
            />
          </Col>
          <Col md={8}>
            <strong>State</strong>:{" "}
            <StateBadge state={profilePropertyRule.state} />
            <br />
            <Form.Group controlId="key">
              <p>
                <strong>Source</strong>:{" "}
                <Link
                  href="/source/[guid]/overview"
                  as={`/source/${profilePropertyRule.source.guid}/overview`}
                >
                  <a>{profilePropertyRule.source.name}</a>
                </Link>
              </p>

              <hr />

              <Form.Label>Key</Form.Label>
              <Form.Control
                required
                type="text"
                value={profilePropertyRule.key}
                onChange={(e) => update(e)}
              />
              <Form.Control.Feedback type="invalid">
                Key is required
              </Form.Control.Feedback>
            </Form.Group>
            <Form.Group controlId="type">
              <Form.Label>Profile Property Type</Form.Label>
              <Form.Control
                as="select"
                value={profilePropertyRule.type}
                onChange={(e) => update(e)}
              >
                <option value="" disabled>
                  Choose a Type
                </option>
                {types.map((type) => (
                  <option key={`type-${type}`}>{type}</option>
                ))}
              </Form.Control>
            </Form.Group>
            <Form.Group controlId="unique">
              <Form.Check
                type="checkbox"
                label="Unique"
                checked={profilePropertyRule.unique}
                onChange={(e) => update(e)}
              />
            </Form.Group>
            <Form.Group controlId="sourceGuid">
              <Form.Label>Profile Property Rule Source</Form.Label>
              <Form.Control
                as="select"
                disabled
                value={profilePropertyRule.source.guid}
              >
                <option value={profilePropertyRule.source.guid}>
                  {profilePropertyRule.source.name}
                </option>
              </Form.Control>
            </Form.Group>
            <hr />
            <p>
              <strong>
                Options for a {profilePropertyRule.source.type} Profile Property
                Rule
              </strong>
            </p>
            {pluginOptions.map((opt, idx) => (
              <div key={`opt-${idx}`}>
                <p>
                  {opt.required ? (
                    <>
                      <Badge variant="info">required</Badge>&nbsp;
                    </>
                  ) : null}
                  <code>{opt.key}</code>
                </p>

                {/* typeahead options */}
                {opt.type === "typeahead" ? (
                  <>
                    <Typeahead
                      id="typeahead"
                      labelKey="key"
                      onChange={(selected) => {
                        if (selected.length === 1 && selected[0].key) {
                          updateOption(opt.key, selected[0].key);
                        }
                      }}
                      options={opt?.options}
                      placeholder={`Select ${opt.key}`}
                      renderMenuItemChildren={(opt, props, idx) => {
                        return [
                          <span key={`opt-${idx}-key`}>
                            {opt.key}
                            <br />
                          </span>,
                          <small
                            key={`opt-${idx}-examples`}
                            className="text-small"
                          >
                            <em>
                              Examples:{" "}
                              {opt.examples
                                ? opt.examples.slice(0, 3).join("").trim() !==
                                  ""
                                  ? opt.examples.slice(0, 3).join(", ")
                                  : "None"
                                : null}
                            </em>
                          </small>,
                        ];
                      }}
                      defaultSelected={
                        profilePropertyRule.options[opt?.key]
                          ? [profilePropertyRule.options[opt?.key]]
                          : undefined
                      }
                    />
                    <Form.Text className="text-muted">
                      {opt.description}
                    </Form.Text>
                    <br />
                  </>
                ) : null}

                {/* list options */}
                {opt.type === "list" ? (
                  <>
                    <Form.Text className="text-muted">
                      {opt.description}
                    </Form.Text>
                    <Table bordered striped size="sm" variant="light">
                      <thead>
                        <tr>
                          <th></th>
                          <th>Key</th>
                          {opt?.options[0]?.description ? (
                            <th>Description</th>
                          ) : null}
                          {opt?.options[0]?.examples ? <th>Examples</th> : null}
                        </tr>
                      </thead>
                      <tbody>
                        {opt?.options?.map((col) => (
                          <tr key={`source-${col.key}`}>
                            <td>
                              <Form.Check
                                inline
                                type="radio"
                                name={opt.key}
                                defaultChecked={
                                  profilePropertyRule.options[opt.key] ===
                                  col.key
                                }
                                onClick={() => updateOption(opt.key, col.key)}
                              />
                            </td>
                            <td>
                              <strong>{col.key}</strong>
                            </td>
                            {col.description ? (
                              <td>{col.description}</td>
                            ) : null}

                            {col.examples ? (
                              <td>{col.examples.slice(0, 3).join(", ")}</td>
                            ) : null}
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </>
                ) : null}

                {/* textarea options */}
                {opt.type === "text" ? (
                  <>
                    <Form.Group controlId="key">
                      <Form.Control
                        required
                        type="text"
                        value={profilePropertyRule.options[opt.key]}
                        onChange={(e) => updateOption(opt.key, e.target.value)}
                      />
                      <Form.Control.Feedback type="invalid">
                        Key is required
                      </Form.Control.Feedback>
                    </Form.Group>
                    <Form.Text className="text-muted">
                      {opt.description}
                    </Form.Text>
                  </>
                ) : null}

                {/* text options */}
                {opt.type === "textarea" ? (
                  <>
                    <Form.Group controlId="key">
                      <Form.Control
                        required
                        as="textarea"
                        rows={5}
                        value={profilePropertyRule.options[opt.key]}
                        onChange={(e) =>
                          updateOption(opt.key, e.target["value"])
                        }
                        placeholder="select statement with mustache template"
                        style={{
                          fontFamily:
                            'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                          color: "#e83e8c",
                        }}
                      />
                      <Form.Control.Feedback type="invalid">
                        Key is required
                      </Form.Control.Feedback>
                    </Form.Group>
                    <Form.Text className="text-muted">
                      {opt.description}
                    </Form.Text>
                    <p>
                      Profile Property Variables:{" "}
                      <Badge variant="light">{`{{ now }}`}</Badge>
                      &nbsp;
                      <Badge variant="light">{`{{ createdAt }}`}</Badge>&nbsp;
                      <Badge variant="light">{`{{ updatedAt }}`}</Badge>&nbsp;
                      {profilePropertyRules
                        .sort((a, b) => {
                          if (a.key > b.key) {
                            return 1;
                          } else {
                            return -1;
                          }
                        })
                        .map((ppr) => (
                          <Fragment key={`var-badge-${ppr.key}`}>
                            <Badge variant="light">{`{{ ${ppr.key} }}`}</Badge>
                            &nbsp;
                          </Fragment>
                        ))}
                    </p>
                    <p>
                      For dates, you can expand them to the <code>sql</code>,{" "}
                      <code>date</code>, <code>time</code>, or <code>iso</code>{" "}
                      formats, ie:{" "}
                      <Badge variant="light">{`{{ now.sql }}`}</Badge>
                    </p>
                  </>
                ) : null}
              </div>
            ))}
            {filterOptions.length > 0 ? (
              <>
                <hr />
                <strong>Filters</strong>
                <p>
                  Are there any criteria where you’d want to filter out rows
                  from being included in{" "}
                  <Badge variant="info">{profilePropertyRule.key}</Badge>?
                </p>

                <Table bordered size="sm">
                  <thead>
                    <tr>
                      <td />
                      <td>
                        <strong>Key</strong>
                      </td>
                      <td>
                        <strong>Operation</strong>
                      </td>
                      <td>
                        <strong>Value</strong>
                      </td>
                      <td>&nbsp;</td>
                    </tr>
                  </thead>

                  <tbody>
                    {localFilters.map((localFilter, idx) => {
                      let rowChanged = false;
                      if (
                        !rulesAreEqual(
                          profilePropertyRule.filters[idx],
                          localFilters[idx]
                        )
                      ) {
                        rowChanged = true;
                        rowChanges = true;
                      }

                      return (
                        <tr key={`rule-${localFilter.key}-${idx}`}>
                          <td>
                            <h5>
                              <Badge variant={rowChanged ? "warning" : "light"}>
                                {idx}
                              </Badge>
                            </h5>
                          </td>
                          <td>
                            <Form.Group
                              controlId={`${localFilter.key}-key-${idx}`}
                            >
                              <Form.Control
                                as="select"
                                value={localFilter.key}
                                onChange={(e: any) => {
                                  const _localFilters = [...localFilters];
                                  localFilter.key = e.target.value;
                                  _localFilters[idx] = localFilter;
                                  setLocalFilters(_localFilters);
                                }}
                              >
                                {filterOptions.map((filter) => (
                                  <option
                                    key={`ruleKeyOpt-${filter.key}-${idx}`}
                                  >
                                    {filter.key}
                                  </option>
                                ))}
                              </Form.Control>
                            </Form.Group>
                          </td>

                          <td>
                            <Form.Group
                              controlId={`${localFilter.key}-op-${idx}`}
                            >
                              <Form.Control
                                as="select"
                                value={localFilter.op}
                                onChange={(e: any) => {
                                  const _localFilters = [...localFilters];
                                  localFilter.op = e.target.value;
                                  _localFilters[idx] = localFilter;
                                  setLocalFilters(_localFilters);
                                }}
                              >
                                {filterOptions.filter(
                                  (fo) => fo.key === localFilter.key
                                ).length === 1
                                  ? filterOptions
                                      .filter(
                                        (fo) => fo.key === localFilter.key
                                      )[0]
                                      .ops.map((op) => (
                                        <option
                                          key={`op-opt-${localFilter.key}-${op}`}
                                        >
                                          {op}
                                        </option>
                                      ))
                                  : null}
                              </Form.Control>
                            </Form.Group>
                          </td>

                          <td>
                            {localFilter.key === "occurredAt" ? (
                              <DatePicker
                                selected={
                                  localFilter.match &&
                                  localFilter.match !== "null"
                                    ? new Date(parseInt(localFilter.match))
                                    : new Date()
                                }
                                onChange={(d: Date) => {
                                  const _localFilter = [...localFilters];
                                  localFilter.match = d.getTime().toString();
                                  _localFilter[idx] = localFilter;
                                  setLocalFilters(_localFilter);
                                }}
                              />
                            ) : (
                              <Form.Group
                                controlId={`${localFilter.key}-match-${idx}`}
                              >
                                <Form.Control
                                  required
                                  type="text"
                                  value={localFilter.match.toString()}
                                  onChange={(e: any) => {
                                    const _localFilter = [...localFilters];
                                    localFilter.match = e.target.value;
                                    _localFilter[idx] = localFilter;
                                    setLocalFilters(_localFilter);
                                  }}
                                />
                              </Form.Group>
                            )}
                          </td>

                          <td>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => {
                                deleteRule(idx);
                              }}
                            >
                              x
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
                {localFilters.length < profilePropertyRule.filters.length ||
                rowChanges ? (
                  <p>
                    <Badge variant="warning">Unsaved Rule Changes</Badge>
                  </p>
                ) : null}
                <Button size="sm" variant="info" onClick={addRule}>
                  Add Filter
                </Button>
              </>
            ) : null}
            <hr />
            <Button variant="primary" type="submit" active={!loading}>
              Update
            </Button>
            <br />
            <br />
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                handleDelete();
              }}
            >
              Delete
            </Button>
          </Col>
          <Col md={3}>
            <ProfilePreview
              {...props}
              profilePropertyRule={profilePropertyRule}
            />
          </Col>
        </Row>
      </Form>
    </>
  );
}

Page.getInitialProps = async (ctx) => {
  const { guid } = ctx.query;
  const { execApi } = useApi(ctx);
  const { profilePropertyRule, pluginOptions } = await execApi(
    "get",
    `/profilePropertyRule/${guid}`
  );
  const { profilePropertyRules } = await execApi(
    "get",
    `/profilePropertyRules`,
    {
      state: "ready",
    }
  );
  const { types } = await execApi("get", `/profilePropertyRuleOptions`);
  const { options: filterOptions } = await execApi(
    "get",
    `/profilePropertyRule/${guid}/filterOptions`
  );
  return {
    profilePropertyRule,
    profilePropertyRules,
    pluginOptions,
    types,
    filterOptions,
  };
};

function rulesAreEqual(a, b) {
  let matched = true;

  const keys = [
    "key",
    "op",
    "match",
    "relativeMatchNumber",
    "relativeMatchUnit",
    "relativeMatchDirection",
  ];

  if (!a || !b) {
    return false;
  }

  for (const i in keys) {
    const key = keys[i];

    if (
      (a[key] === undefined || a[key] == null) &&
      (b[key] === undefined || b[key] == null)
    ) {
      continue;
    }

    if (a[key] !== b[key]) {
      matched = false;
      break;
    }
  }

  return matched;
}
