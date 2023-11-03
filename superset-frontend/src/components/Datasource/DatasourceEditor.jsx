/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import rison from 'rison';
import { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { Radio } from 'src/components/Radio';
import Card from 'src/components/Card';
import Alert from 'src/components/Alert';
import Badge from 'src/components/Badge';
import shortid from 'shortid';
import {
  css,
  isFeatureEnabled,
  FeatureFlag,
  styled,
  SupersetClient,
  t,
  withTheme,
} from '@superset-ui/core';
import { Select, AsyncSelect, Row, Col } from 'src/components';
import { FormLabel } from 'src/components/Form';
import Button from 'src/components/Button';
import Tabs from 'src/components/Tabs';
import CertifiedBadge from 'src/components/CertifiedBadge';
import WarningIconWithTooltip from 'src/components/WarningIconWithTooltip';
import DatabaseSelector from 'src/components/DatabaseSelector';
import Label from 'src/components/Label';
import Loading from 'src/components/Loading';
import TableSelector from 'src/components/TableSelector';
import EditableTitle from 'src/components/EditableTitle';
import { getClientErrorObject } from 'src/utils/getClientErrorObject';
import CheckboxControl from 'src/explore/components/controls/CheckboxControl';
import TextControl from 'src/explore/components/controls/TextControl';
import TextAreaControl from 'src/explore/components/controls/TextAreaControl';
import SpatialControl from 'src/explore/components/controls/SpatialControl';
import withToasts from 'src/components/MessageToasts/withToasts';
import Icons from 'src/components/Icons';
import CurrencyControl from 'src/explore/components/controls/CurrencyControl';
import CollectionTable from './CollectionTable';
import Fieldset from './Fieldset';
import Field from './Field';

const DatasourceContainer = styled.div`
  .change-warning {
    margin: 16px 10px 0;
    color: ${({ theme }) => theme.colors.warning.base};
  }

  .change-warning .bold {
    font-weight: ${({ theme }) => theme.typography.weights.bold};
  }

  .form-group.has-feedback > .help-block {
    margin-top: 8px;
  }

  .form-group.form-group-md {
    margin-bottom: 8px;
  }
`;

const FlexRowContainer = styled.div`
  align-items: center;
  display: flex;

  svg {
    margin-right: ${({ theme }) => theme.gridUnit}px;
  }
`;

const StyledTableTabs = styled(Tabs)`
  overflow: visible;
  .ant-tabs-content-holder {
    overflow: visible;
  }
`;

const StyledBadge = styled(Badge)`
  .ant-badge-count {
    line-height: ${({ theme }) => theme.gridUnit * 4}px;
    height: ${({ theme }) => theme.gridUnit * 4}px;
    margin-left: ${({ theme }) => theme.gridUnit}px;
  }
`;

const EditLockContainer = styled.div`
  font-size: ${({ theme }) => theme.typography.sizes.s}px;
  display: flex;
  align-items: center;
  a {
    padding: 0 10px;
  }
`;

const ColumnButtonWrapper = styled.div`
  text-align: right;
  ${({ theme }) => `margin-bottom: ${theme.gridUnit * 2}px`}
`;

const StyledLabelWrapper = styled.div`
  display: flex;
  align-items: center;
  span {
    margin-right: ${({ theme }) => theme.gridUnit}px;
  }
`;

const StyledColumnsTabWrapper = styled.div`
  .table > tbody > tr > td {
    vertical-align: middle;
  }

  .ant-tag {
    margin-top: ${({ theme }) => theme.gridUnit}px;
  }
`;

const StyledButtonWrapper = styled.span`
  ${({ theme }) => `
    margin-top: ${theme.gridUnit * 3}px;
    margin-left: ${theme.gridUnit * 3}px;
  `}
`;

const checkboxGenerator = (d, onChange) => (
  <CheckboxControl value={d} onChange={onChange} />
);
const DATA_TYPES = [
  { value: 'STRING', label: t('STRING') },
  { value: 'NUMERIC', label: t('NUMERIC') },
  { value: 'DATETIME', label: t('DATETIME') },
  { value: 'BOOLEAN', label: t('BOOLEAN') },
];

const DATASOURCE_TYPES_ARR = [
  { key: 'physical', label: t('Physical (table or view)') },
  { key: 'virtual', label: t('Virtual (SQL)') },
];
const DATASOURCE_TYPES = {};
DATASOURCE_TYPES_ARR.forEach(o => {
  DATASOURCE_TYPES[o.key] = o;
});

function CollectionTabTitle({ title, collection }) {
  return (
    <div
      css={{ display: 'flex', alignItems: 'center' }}
      data-test={`collection-tab-${title}`}
    >
      {title}{' '}
      <StyledBadge count={collection ? collection.length : 0} showZero />
    </div>
  );
}

CollectionTabTitle.propTypes = {
  title: PropTypes.string,
  collection: PropTypes.array,
};

function ColumnCollectionTable({
  columns,
  datasource,
  onColumnsChange,
  onDatasourceChange,
  editableColumnName,
  showExpression,
  allowAddItem,
  allowEditDataType,
  itemGenerator,
  columnLabelTooltips,
}) {
  return (
    <CollectionTable
      tableColumns={
        isFeatureEnabled(FeatureFlag.ENABLE_ADVANCED_DATA_TYPES)
          ? [
              'column_name',
              'advanced_data_type',
              'type',
              'is_dttm',
              'main_dttm_col',
              'filterable',
              'groupby',
            ]
          : [
              'column_name',
              'type',
              'is_dttm',
              'main_dttm_col',
              'filterable',
              'groupby',
            ]
      }
      sortColumns={
        isFeatureEnabled(FeatureFlag.ENABLE_ADVANCED_DATA_TYPES)
          ? [
              'column_name',
              'advanced_data_type',
              'type',
              'is_dttm',
              'main_dttm_col',
              'filterable',
              'groupby',
            ]
          : [
              'column_name',
              'type',
              'is_dttm',
              'main_dttm_col',
              'filterable',
              'groupby',
            ]
      }
      allowDeletes
      allowAddItem={allowAddItem}
      itemGenerator={itemGenerator}
      collection={columns}
      columnLabelTooltips={columnLabelTooltips}
      stickyHeader
      expandFieldset={
        <FormContainer>
          <Fieldset compact>
            {showExpression && (
              <Field
                fieldKey="expression"
                label={t('SQL expression')}
                control={
                  <TextAreaControl
                    language="markdown"
                    offerEditInModal={false}
                    resize="vertical"
                  />
                }
              />
            )}
            <Field
              fieldKey="verbose_name"
              label={t('Label')}
              control={
                <TextControl
                  controlId="verbose_name"
                  placeholder={t('Label')}
                />
              }
            />
            <Field
              fieldKey="description"
              label={t('Description')}
              control={
                <TextControl
                  controlId="description"
                  placeholder={t('Description')}
                />
              }
            />
            {allowEditDataType && (
              <Field
                fieldKey="type"
                label={t('Data type')}
                control={
                  <Select
                    ariaLabel={t('Data type')}
                    options={DATA_TYPES}
                    name="type"
                    allowNewOptions
                    allowClear
                  />
                }
              />
            )}
            {isFeatureEnabled(FeatureFlag.ENABLE_ADVANCED_DATA_TYPES) ? (
              <Field
                fieldKey="advanced_data_type"
                label={t('Advanced data type')}
                control={
                  <TextControl
                    controlId="advanced_data_type"
                    placeholder={t('Advanced Data type')}
                  />
                }
              />
            ) : (
              <></>
            )}
            <Field
              fieldKey="python_date_format"
              label={t('Datetime format')}
              description={
                /* Note the fragmented translations may not work. */
                <div>
                  {t('The pattern of timestamp format. For strings use ')}
                  <a href="https://docs.python.org/2/library/datetime.html#strftime-strptime-behavior">
                    {t('Python datetime string pattern')}
                  </a>
                  {t(' expression which needs to adhere to the ')}
                  <a href="https://en.wikipedia.org/wiki/ISO_8601">
                    {t('ISO 8601')}
                  </a>
                  {t(` standard to ensure that the lexicographical ordering
                      coincides with the chronological ordering. If the
                      timestamp format does not adhere to the ISO 8601 standard
                      you will need to define an expression and type for
                      transforming the string into a date or timestamp. Note
                      currently time zones are not supported. If time is stored
                      in epoch format, put \`epoch_s\` or \`epoch_ms\`. If no pattern
                      is specified we fall back to using the optional defaults on a per
                      database/column name level via the extra parameter.`)}
                </div>
              }
              control={
                <TextControl
                  controlId="python_date_format"
                  placeholder="%Y/%m/%d"
                />
              }
            />
            <Field
              fieldKey="certified_by"
              label={t('Certified By')}
              description={t('Person or group that has certified this metric')}
              control={
                <TextControl
                  controlId="certified"
                  placeholder={t('Certified by')}
                />
              }
            />
            <Field
              fieldKey="certification_details"
              label={t('Certification details')}
              description={t('Details of the certification')}
              control={
                <TextControl
                  controlId="certificationDetails"
                  placeholder={t('Certification details')}
                />
              }
            />
          </Fieldset>
        </FormContainer>
      }
      columnLabels={
        isFeatureEnabled(FeatureFlag.ENABLE_ADVANCED_DATA_TYPES)
          ? {
              column_name: t('Column'),
              advanced_data_type: t('Advanced data type'),
              type: t('Data type'),
              groupby: t('Is dimension'),
              is_dttm: t('Is temporal'),
              main_dttm_col: t('Default datetime'),
              filterable: t('Is filterable'),
            }
          : {
              column_name: t('Column'),
              type: t('Data type'),
              groupby: t('Is dimension'),
              is_dttm: t('Is temporal'),
              main_dttm_col: t('Default datetime'),
              filterable: t('Is filterable'),
            }
      }
      onChange={onColumnsChange}
      itemRenderers={
        isFeatureEnabled(FeatureFlag.ENABLE_ADVANCED_DATA_TYPES)
          ? {
              column_name: (v, onItemChange, _, record) =>
                editableColumnName ? (
                  <StyledLabelWrapper>
                    {record.is_certified && (
                      <CertifiedBadge
                        certifiedBy={record.certified_by}
                        details={record.certification_details}
                      />
                    )}
                    <EditableTitle
                      canEdit
                      title={v}
                      onSaveTitle={onItemChange}
                    />
                  </StyledLabelWrapper>
                ) : (
                  <StyledLabelWrapper>
                    {record.is_certified && (
                      <CertifiedBadge
                        certifiedBy={record.certified_by}
                        details={record.certification_details}
                      />
                    )}
                    {v}
                  </StyledLabelWrapper>
                ),
              main_dttm_col: (value, _onItemChange, _label, record) => {
                const checked = datasource.main_dttm_col === record.column_name;
                const disabled = !columns.find(
                  column => column.column_name === record.column_name,
                ).is_dttm;
                return (
                  <Radio
                    data-test={`radio-default-dttm-${record.column_name}`}
                    checked={checked}
                    disabled={disabled}
                    onChange={() =>
                      onDatasourceChange({
                        ...datasource,
                        main_dttm_col: record.column_name,
                      })
                    }
                  />
                );
              },
              type: d => (d ? <Label>{d}</Label> : null),
              advanced_data_type: d => (
                <Label onChange={onColumnsChange}>{d}</Label>
              ),
              is_dttm: checkboxGenerator,
              filterable: checkboxGenerator,
              groupby: checkboxGenerator,
            }
          : {
              column_name: (v, onItemChange, _, record) =>
                editableColumnName ? (
                  <StyledLabelWrapper>
                    {record.is_certified && (
                      <CertifiedBadge
                        certifiedBy={record.certified_by}
                        details={record.certification_details}
                      />
                    )}
                    <TextControl value={v} onChange={onItemChange} />
                  </StyledLabelWrapper>
                ) : (
                  <StyledLabelWrapper>
                    {record.is_certified && (
                      <CertifiedBadge
                        certifiedBy={record.certified_by}
                        details={record.certification_details}
                      />
                    )}
                    {v}
                  </StyledLabelWrapper>
                ),
              main_dttm_col: (value, _onItemChange, _label, record) => {
                const checked = datasource.main_dttm_col === record.column_name;
                const disabled = !columns.find(
                  column => column.column_name === record.column_name,
                ).is_dttm;
                return (
                  <Radio
                    data-test={`radio-default-dttm-${record.column_name}`}
                    checked={checked}
                    disabled={disabled}
                    onChange={() =>
                      onDatasourceChange({
                        ...datasource,
                        main_dttm_col: record.column_name,
                      })
                    }
                  />
                );
              },
              type: d => (d ? <Label>{d}</Label> : null),
              is_dttm: checkboxGenerator,
              filterable: checkboxGenerator,
              groupby: checkboxGenerator,
            }
      }
    />
  );
}
ColumnCollectionTable.propTypes = {
  columns: PropTypes.array.isRequired,
  datasource: PropTypes.object.isRequired,
  onColumnsChange: PropTypes.func.isRequired,
  onDatasourceChange: PropTypes.func.isRequired,
  editableColumnName: PropTypes.bool,
  showExpression: PropTypes.bool,
  allowAddItem: PropTypes.bool,
  allowEditDataType: PropTypes.bool,
  itemGenerator: PropTypes.func,
};
ColumnCollectionTable.defaultProps = {
  editableColumnName: false,
  showExpression: false,
  allowAddItem: false,
  allowEditDataType: false,
  itemGenerator: () => ({
    column_name: t('<new column>'),
    filterable: true,
    groupby: true,
  }),
};

function StackedField({ label, formElement }) {
  return (
    <div>
      <div>
        <strong>{label}</strong>
      </div>
      <div>{formElement}</div>
    </div>
  );
}

StackedField.propTypes = {
  label: PropTypes.string,
  formElement: PropTypes.node,
};

function FormContainer({ children }) {
  return <Card padded>{children}</Card>;
}

FormContainer.propTypes = {
  children: PropTypes.node,
};

const propTypes = {
  datasource: PropTypes.object.isRequired,
  onChange: PropTypes.func,
  addSuccessToast: PropTypes.func.isRequired,
  addDangerToast: PropTypes.func.isRequired,
  setIsEditing: PropTypes.func,
};

const defaultProps = {
  onChange: () => {},
  setIsEditing: () => {},
};

function OwnersSelector({ datasource, onChange }) {
  const loadOptions = useCallback((search = '', page, pageSize) => {
    const query = rison.encode({ filter: search, page, page_size: pageSize });
    return SupersetClient.get({
      endpoint: `/api/v1/dataset/related/owners?q=${query}`,
    }).then(response => ({
      data: response.json.result
        .filter(item => item.extra.active)
        .map(item => ({
          value: item.value,
          label: item.text,
        })),
      totalCount: response.json.count,
    }));
  }, []);

  return (
    <AsyncSelect
      ariaLabel={t('Select owners')}
      mode="multiple"
      name="owners"
      value={datasource.owners}
      options={loadOptions}
      onChange={onChange}
      header={<FormLabel>{t('Owners')}</FormLabel>}
      allowClear
    />
  );
}

const DatasourceEditor = props => {
  const {
    certified_by: certifiedByMetric,
    certification_details: certificationDetails,
  } = metric;
  const {
    certification: { details, certified_by: certifiedBy } = {},
    warning_markdown: warningMarkdown,
  } = JSON.parse(metric.extra || '{}') || {};

  const [datasource, setDatasource] = useState({
    ...props.datasource,
    owners: props.datasource.owners.map(owner => ({
      value: owner.value || owner.id,
      label: owner.label || `${owner.first_name} ${owner.last_name}`,
    })),
    metrics: props.datasource.metrics?.map(metric => {
      const {
        certified_by: certifiedByMetric,
        certification_details: certificationDetails,
      } = metric;
      const {
        certification: { details, certified_by: certifiedBy } = {},
        warning_markdown: warningMarkdown,
      } = JSON.parse(metric.extra || '{}') || {};
      return {
        ...metric,
        certification_details: certificationDetails || details,
        warning_markdown: warningMarkdown || '',
        certified_by: certifiedBy || certifiedByMetric,
      };
    }),
  });
  const [errors, setErrors] = useState([]);
  const [isSqla, setIsSqla] = useState(
    props.datasource.datasource_type === 'table' ||
      props.datasource.type === 'table',
  );
  const [isEditMode, setIsEditMode] = useState(false);
  const [databaseColumns, setDatabaseColumns] = useState(
    props.datasource.columns.filter(col => !col.expression),
  );
  const [calculatedColumns, setCalculatedColumns] = useState(
    props.datasource.columns.filter(col => !!col.expression),
  );
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState(0);
  const [datasourceType, setDatasourceType] = useState(
    props.datasource.sql
      ? DATASOURCE_TYPES.virtual.key
      : DATASOURCE_TYPES.physical.key,
  );

  const onChangeHandler = useCallback(() => {
    // Emptying SQL if "Physical" radio button is selected
    // Currently the logic to know whether the source is
    // physical or virtual is based on whether SQL is empty or not.

    const sql =
      datasourceType === DATASOURCE_TYPES.physical.key ? '' : datasource.sql;
    const newDatasource = {
      ...datasource,
      sql,
      columns: [...databaseColumns, ...calculatedColumns],
    };
    props.onChange(newDatasource, errors);
  }, [datasourceType, datasource, databaseColumns, calculatedColumns, errors]);
  const onChangeEditModeHandler = useCallback(() => {
    props.setIsEditing(!isEditMode);
    setStateHandler(prevState => ({ isEditMode: !prevState.isEditMode }));
  }, [isEditMode]);
  const onDatasourceChangeHandler = useCallback(
    (datasource, callback = validateAndChangeHandler) => {
      setStateHandler({ datasource }, callback);
    },
    [datasource],
  );
  const onDatasourcePropChangeHandler = useCallback(
    (attr, value) => {
      if (value === undefined) return; // if value is undefined do not update state
      const datasource = { ...datasource, [attr]: value };
      setStateHandler(
        prevState => ({
          datasource: { ...prevState.datasource, [attr]: value },
        }),
        attr === 'table_name'
          ? onDatasourceChangeHandler(
              datasource,
              tableChangeAndSyncMetadataHandler,
            )
          : onDatasourceChangeHandler(datasource, validateAndChangeHandler),
      );
    },
    [datasource],
  );
  const onDatasourceTypeChangeHandler = useCallback(
    datasourceType => {
      setDatasourceType(datasourceType);
    },
    [datasourceType],
  );
  const setColumnsHandler = useCallback(obj => {
    // update calculatedColumns or databaseColumns
    setStateHandler(obj, validateAndChangeHandler);
  }, []);
  const validateAndChangeHandler = useCallback(() => {
    validateHandler(onChangeHandler);
  }, []);
  const tableChangeAndSyncMetadataHandler = useCallback(() => {
    validateHandler(() => {
      syncMetadata();
      onChangeHandler();
    });
  }, []);
  const updateColumnsHandler = useCallback(
    cols => {
      // cols: Array<{column_name: string; is_dttm: boolean; type: string;}>

      const databaseColumnNames = cols.map(col => col.column_name);
      const currentCols = databaseColumns.reduce(
        (agg, col) => ({
          ...agg,
          [col.column_name]: col,
        }),
        {},
      );
      const finalColumns = [];
      const results = {
        added: [],
        modified: [],
        removed: databaseColumns
          .map(col => col.column_name)
          .filter(col => !databaseColumnNames.includes(col)),
      };
      cols.forEach(col => {
        const currentCol = currentCols[col.column_name];
        if (!currentCol) {
          // new column
          finalColumns.push({
            id: shortid.generate(),
            column_name: col.column_name,
            type: col.type,
            groupby: true,
            filterable: true,
            is_dttm: col.is_dttm,
          });
          results.added.push(col.column_name);
        } else if (
          currentCol.type !== col.type ||
          (!currentCol.is_dttm && col.is_dttm)
        ) {
          // modified column
          finalColumns.push({
            ...currentCol,
            type: col.type,
            is_dttm: currentCol.is_dttm || col.is_dttm,
          });
          results.modified.push(col.column_name);
        } else {
          // unchanged
          finalColumns.push(currentCol);
        }
      });
      if (
        results.added.length ||
        results.modified.length ||
        results.removed.length
      ) {
        setColumnsHandler({ databaseColumns: finalColumns });
      }
      return results;
    },
    [databaseColumns],
  );
  const syncMetadata = useMemo(() => {
    const params = {
      datasource_type: datasource.type || datasource.datasource_type,
      database_name:
        datasource.database.database_name || datasource.database.name,
      schema_name: datasource.schema,
      table_name: datasource.table_name
        ? encodeURIComponent(datasource.table_name)
        : datasource.table_name,
      normalize_columns: datasource.normalize_columns,
      always_filter_main_dttm: datasource.always_filter_main_dttm,
    };
    Object.entries(params).forEach(([key, value]) => {
      // rison can't encode the undefined value
      if (value === undefined) {
        params[key] = null;
      }
    });
    const endpoint = `/datasource/external_metadata_by_name/?q=${rison.encode(
      params,
    )}`;
    setMetadataLoading(true);

    SupersetClient.get({ endpoint })
      .then(({ json }) => {
        const results = updateColumnsHandler(json);
        if (results.modified.length) {
          props.addSuccessToast(
            t('Modified columns: %s', results.modified.join(', ')),
          );
        }
        if (results.removed.length) {
          props.addSuccessToast(
            t('Removed columns: %s', results.removed.join(', ')),
          );
        }
        if (results.added.length) {
          props.addSuccessToast(
            t('New columns added: %s', results.added.join(', ')),
          );
        }
        props.addSuccessToast(t('Metadata has been synced'));
        setMetadataLoading(false);
      })
      .catch(response =>
        getClientErrorObject(response).then(({ error, statusText }) => {
          props.addDangerToast(
            error || statusText || t('An error has occurred'),
          );
          setMetadataLoading(false);
        }),
      );
  }, [datasource]);
  const findDuplicatesHandler = useCallback((arr, accessor) => {
    const seen = {};
    const dups = [];
    arr.forEach(obj => {
      const item = accessor(obj);
      if (item in seen) {
        dups.push(item);
      } else {
        seen[item] = null;
      }
    });
    return dups;
  }, []);
  const validateHandler = useCallback(
    callback => {
      let errors = [];
      let dups;

      // Looking for duplicate column_name
      dups = findDuplicatesHandler(datasource.columns, obj => obj.column_name);
      setErrors(
        errors.concat(
          dups.map(name => t('Column name [%s] is duplicated', name)),
        ),
      );

      // Looking for duplicate metric_name
      dups = findDuplicatesHandler(datasource.metrics, obj => obj.metric_name);
      setErrors(
        errors.concat(
          dups.map(name => t('Metric name [%s] is duplicated', name)),
        ),
      );

      // Making sure calculatedColumns have an expression defined
      const noFilterCalcCols = calculatedColumns.filter(
        col => !col.expression && !col.json,
      );
      setErrors(
        errors.concat(
          noFilterCalcCols.map(col =>
            t('Calculated column [%s] requires an expression', col.column_name),
          ),
        ),
      );

      // validate currency code
      try {
        datasource.metrics?.forEach(
          metric =>
            metric.currency?.symbol &&
            new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: metric.currency.symbol,
            }),
        );
      } catch {
        setErrors(errors.concat([t('Invalid currency code in saved metrics')]));
      }

      setStateHandler({ errors }, callback);
    },
    [errors, datasource, calculatedColumns],
  );
  const handleTabSelectHandler = useCallback(
    activeTabKey => {
      setActiveTabKey(activeTabKey);
    },
    [activeTabKey],
  );
  const sortMetricsHandler = useCallback(metrics => {
    return metrics.sort(({ id: a }, { id: b }) => b - a);
  }, []);
  const renderSettingsFieldsetHandler = useCallback(() => {
    return (
      <Fieldset
        title={t('Basic')}
        item={datasource}
        onChange={onDatasourceChangeHandler}
      >
        <Field
          fieldKey="description"
          label={t('Description')}
          control={
            <TextAreaControl
              language="markdown"
              offerEditInModal={false}
              resize="vertical"
            />
          }
        />
        <Field
          fieldKey="default_endpoint"
          label={t('Default URL')}
          description={t(
            'Default URL to redirect to when accessing from the dataset list page',
          )}
          control={<TextControl controlId="default_endpoint" />}
        />
        <Field
          inline
          fieldKey="filter_select_enabled"
          label={t('Autocomplete filters')}
          description={t('Whether to populate autocomplete filters options')}
          control={<CheckboxControl />}
        />
        {isSqla && (
          <Field
            fieldKey="fetch_values_predicate"
            label={t('Autocomplete query predicate')}
            description={t(
              'When using "Autocomplete filters", this can be used to improve performance ' +
                'of the query fetching the values. Use this option to apply a ' +
                'predicate (WHERE clause) to the query selecting the distinct ' +
                'values from the table. Typically the intent would be to limit the scan ' +
                'by applying a relative time filter on a partitioned or indexed time-related field.',
            )}
            control={
              <TextAreaControl
                language="sql"
                controlId="fetch_values_predicate"
                minLines={5}
                resize="vertical"
              />
            }
          />
        )}
        {isSqla && (
          <Field
            fieldKey="extra"
            label={t('Extra')}
            description={t(
              'Extra data to specify table metadata. Currently supports ' +
                'metadata of the format: `{ "certification": { "certified_by": ' +
                '"Data Platform Team", "details": "This table is the source of truth." ' +
                '}, "warning_markdown": "This is a warning." }`.',
            )}
            control={
              <TextAreaControl
                controlId="extra"
                language="json"
                offerEditInModal={false}
                resize="vertical"
              />
            }
          />
        )}
        <OwnersSelector
          datasource={datasource}
          onChange={newOwners => {
            onDatasourceChangeHandler({ ...datasource, owners: newOwners });
          }}
        />
      </Fieldset>
    );
  }, [datasource, isSqla]);
  const renderAdvancedFieldsetHandler = useCallback(() => {
    return (
      <Fieldset
        title={t('Advanced')}
        item={datasource}
        onChange={onDatasourceChangeHandler}
      >
        <Field
          fieldKey="cache_timeout"
          label={t('Cache timeout')}
          description={t(
            'The duration of time in seconds before the cache is invalidated. Set to -1 to bypass the cache.',
          )}
          control={<TextControl controlId="cache_timeout" />}
        />
        <Field
          fieldKey="offset"
          label={t('Hours offset')}
          control={<TextControl controlId="offset" />}
          description={t(
            'The number of hours, negative or positive, to shift the time column. This can be used to move UTC time to local time.',
          )}
        />
        {isSqla && (
          <Field
            fieldKey="template_params"
            label={t('Template parameters')}
            description={t(
              'A set of parameters that become available in the query using Jinja templating syntax',
            )}
            control={<TextControl controlId="template_params" />}
          />
        )}
        <Field
          inline
          fieldKey="normalize_columns"
          label={t('Normalize column names')}
          description={t(
            'Allow column names to be changed to case insensitive format, if supported (e.g. Oracle, Snowflake).',
          )}
          control={<CheckboxControl controlId="normalize_columns" />}
        />
        <Field
          inline
          fieldKey="always_filter_main_dttm"
          label={t('Always filter main datetime column')}
          description={t(
            `When the secondary temporal columns are filtered, apply the same filter to the main datetime column.`,
          )}
          control={<CheckboxControl controlId="always_filter_main_dttm" />}
        />
      </Fieldset>
    );
  }, [datasource, isSqla]);
  const renderSpatialTabHandler = useCallback(() => {
    const { spatials, all_cols: allCols } = datasource;
    return (
      <Tabs.TabPane
        tab={<CollectionTabTitle collection={spatials} title={t('Spatial')} />}
        key={4}
      >
        <CollectionTable
          tableColumns={['name', 'config']}
          onChange={onDatasourcePropChangeHandler.bind(this, 'spatials')}
          itemGenerator={() => ({
            name: t('<new spatial>'),
            type: t('<no type>'),
            config: null,
          })}
          collection={spatials}
          allowDeletes
          itemRenderers={{
            name: (d, onChange) => (
              <EditableTitle canEdit title={d} onSaveTitle={onChange} />
            ),
            config: (v, onChange) => (
              <SpatialControl value={v} onChange={onChange} choices={allCols} />
            ),
          }}
        />
      </Tabs.TabPane>
    );
  }, [datasource]);
  const renderSourceFieldsetHandler = useCallback(
    theme => {
      return (
        <div>
          {allowEditSourceHandler && (
            <EditLockContainer>
              <span
                role="button"
                tabIndex={0}
                onClick={onChangeEditModeHandler}
              >
                {isEditMode ? (
                  <Icons.LockUnlocked iconColor={theme.colors.grayscale.base} />
                ) : (
                  <Icons.LockLocked iconColor={theme.colors.grayscale.base} />
                )}
              </span>
              {!isEditMode && <div>{t('Click the lock to make changes.')}</div>}
              {isEditMode && (
                <div>{t('Click the lock to prevent further changes.')}</div>
              )}
            </EditLockContainer>
          )}
          <div className="m-l-10 m-t-20 m-b-10">
            {DATASOURCE_TYPES_ARR.map(type => (
              <Radio
                key={type.key}
                value={type.key}
                inline
                onChange={onDatasourceTypeChangeHandler.bind(this, type.key)}
                checked={datasourceType === type.key}
                disabled={!isEditMode}
              >
                {type.label}
              </Radio>
            ))}
          </div>
          <hr />
          <Fieldset
            item={datasource}
            onChange={onDatasourceChangeHandler}
            compact
          >
            {datasourceType === DATASOURCE_TYPES.virtual.key && (
              <div>
                {isSqla && (
                  <>
                    <Col xs={24} md={12}>
                      <Field
                        fieldKey="databaseSelector"
                        label={t('virtual')}
                        control={
                          <div css={{ marginTop: 8 }}>
                            <DatabaseSelector
                              db={datasource?.database}
                              schema={datasource.schema}
                              onSchemaChange={schema =>
                                isEditMode &&
                                onDatasourcePropChangeHandler('schema', schema)
                              }
                              onDbChange={database =>
                                isEditMode &&
                                onDatasourcePropChangeHandler(
                                  'database',
                                  database,
                                )
                              }
                              formMode={false}
                              handleError={props.addDangerToast}
                              readOnly={!isEditMode}
                            />
                          </div>
                        }
                      />
                      <div css={{ width: 'calc(100% - 34px)', marginTop: -16 }}>
                        <Field
                          fieldKey="table_name"
                          label={t('Dataset name')}
                          control={
                            <TextControl
                              controlId="table_name"
                              onChange={table => {
                                onDatasourcePropChangeHandler(
                                  'table_name',
                                  table,
                                );
                              }}
                              placeholder={t('Dataset name')}
                              disabled={!isEditMode}
                            />
                          }
                        />
                      </div>
                    </Col>
                    <Field
                      fieldKey="sql"
                      label={t('SQL')}
                      description={t(
                        'When specifying SQL, the datasource acts as a view. ' +
                          'Superset will use this statement as a subquery while grouping and filtering ' +
                          'on the generated parent queries.',
                      )}
                      control={
                        <TextAreaControl
                          language="sql"
                          offerEditInModal={false}
                          minLines={20}
                          maxLines={20}
                          readOnly={!isEditMode}
                          resize="both"
                        />
                      }
                    />
                  </>
                )}
              </div>
            )}
            {datasourceType === DATASOURCE_TYPES.physical.key && (
              <Col xs={24} md={12}>
                {isSqla && (
                  <Field
                    fieldKey="tableSelector"
                    label={t('Physical')}
                    control={
                      <div css={{ marginTop: 8 }}>
                        <TableSelector
                          clearable={false}
                          database={{
                            ...datasource.database,
                            database_name:
                              datasource.database?.database_name ||
                              datasource.database?.name,
                          }}
                          dbId={datasource.database?.id}
                          handleError={props.addDangerToast}
                          schema={datasource.schema}
                          sqlLabMode={false}
                          tableValue={datasource.table_name}
                          onSchemaChange={
                            isEditMode
                              ? schema =>
                                  onDatasourcePropChangeHandler(
                                    'schema',
                                    schema,
                                  )
                              : undefined
                          }
                          onDbChange={
                            isEditMode
                              ? database =>
                                  onDatasourcePropChangeHandler(
                                    'database',
                                    database,
                                  )
                              : undefined
                          }
                          onTableSelectChange={
                            isEditMode
                              ? table =>
                                  onDatasourcePropChangeHandler(
                                    'table_name',
                                    table,
                                  )
                              : undefined
                          }
                          readOnly={!isEditMode}
                        />
                      </div>
                    }
                    description={t(
                      'The pointer to a physical table (or view). Keep in mind that the chart is ' +
                        'associated to this Superset logical table, and this logical table points ' +
                        'the physical table referenced here.',
                    )}
                  />
                )}
              </Col>
            )}
          </Fieldset>
        </div>
      );
    },
    [isEditMode, datasourceType, datasource, isSqla],
  );
  const renderErrorsHandler = useCallback(() => {
    if (errors.length > 0) {
      return (
        <Alert
          css={theme => ({ marginBottom: theme.gridUnit * 4 })}
          type="error"
          message={
            <>
              {errors.map(err => (
                <div key={err}>{err}</div>
              ))}
            </>
          }
        />
      );
    }
    return null;
  }, [errors]);
  const renderMetricCollectionHandler = useCallback(() => {
    const { metrics } = datasource;
    const sortedMetrics = metrics?.length ? sortMetricsHandler(metrics) : [];
    return (
      <CollectionTable
        tableColumns={['metric_name', 'verbose_name', 'expression']}
        sortColumns={['metric_name', 'verbose_name', 'expression']}
        columnLabels={{
          metric_name: t('Metric Key'),
          verbose_name: t('Label'),
          expression: t('SQL expression'),
        }}
        columnLabelTooltips={{
          metric_name: t(
            'This field is used as a unique identifier to attach ' +
              'the metric to charts. It is also used as the alias in the ' +
              'SQL query.',
          ),
        }}
        expandFieldset={
          <FormContainer>
            <Fieldset compact>
              <Field
                fieldKey="description"
                label={t('Description')}
                control={
                  <TextControl
                    controlId="description"
                    placeholder={t('Description')}
                  />
                }
              />
              <Field
                fieldKey="d3format"
                label={t('D3 format')}
                control={
                  <TextControl controlId="d3format" placeholder="%y/%m/%d" />
                }
              />
              <Field
                fieldKey="currency"
                label={t('Metric currency')}
                control={
                  <CurrencyControl
                    currencySelectOverrideProps={{
                      placeholder: t('Select or type currency symbol'),
                    }}
                    symbolSelectAdditionalStyles={css`
                      max-width: 30%;
                    `}
                  />
                }
              />
              <Field
                label={t('Certified by')}
                fieldKey="certified_by"
                description={t(
                  'Person or group that has certified this metric',
                )}
                control={
                  <TextControl
                    controlId="certified_by"
                    placeholder={t('Certified by')}
                  />
                }
              />
              <Field
                label={t('Certification details')}
                fieldKey="certification_details"
                description={t('Details of the certification')}
                control={
                  <TextControl
                    controlId="certification_details"
                    placeholder={t('Certification details')}
                  />
                }
              />
              <Field
                label={t('Warning')}
                fieldKey="warning_markdown"
                description={t('Optional warning about use of this metric')}
                control={
                  <TextAreaControl
                    controlId="warning_markdown"
                    language="markdown"
                    offerEditInModal={false}
                    resize="vertical"
                  />
                }
              />
            </Fieldset>
          </FormContainer>
        }
        collection={sortedMetrics}
        allowAddItem
        onChange={onDatasourcePropChangeHandler.bind(this, 'metrics')}
        itemGenerator={() => ({
          metric_name: t('<new metric>'),
          verbose_name: '',
          expression: '',
        })}
        itemCellProps={{
          expression: () => ({
            width: '240px',
          }),
        }}
        itemRenderers={{
          metric_name: (v, onChange, _, record) => (
            <FlexRowContainer>
              {record.is_certified && (
                <CertifiedBadge
                  certifiedBy={record.certified_by}
                  details={record.certification_details}
                />
              )}
              {record.warning_markdown && (
                <WarningIconWithTooltip
                  warningMarkdown={record.warning_markdown}
                />
              )}
              <EditableTitle canEdit title={v} onSaveTitle={onChange} />
            </FlexRowContainer>
          ),
          verbose_name: (v, onChange) => (
            <TextControl canEdit value={v} onChange={onChange} />
          ),
          expression: (v, onChange) => (
            <TextAreaControl
              canEdit
              initialValue={v}
              onChange={onChange}
              extraClasses={['datasource-sql-expression']}
              language="sql"
              offerEditInModal={false}
              minLines={5}
              textAreaStyles={{ minWidth: '200px', maxWidth: '450px' }}
              resize="both"
            />
          ),
          description: (v, onChange, label) => (
            <StackedField
              label={label}
              formElement={<TextControl value={v} onChange={onChange} />}
            />
          ),
          d3format: (v, onChange, label) => (
            <StackedField
              label={label}
              formElement={<TextControl value={v} onChange={onChange} />}
            />
          ),
        }}
        allowDeletes
        stickyHeader
      />
    );
  }, [datasource]);

  const { metrics } = datasource;
  const sortedMetrics = metrics?.length ? sortMetricsHandler(metrics) : [];
  const { theme } = props;

  return (
    <DatasourceContainer>
      {renderErrorsHandler()}
      <Alert
        css={theme => ({ marginBottom: theme.gridUnit * 4 })}
        type="warning"
        message={
          <>
            {' '}
            <strong>{t('Be careful.')} </strong>
            {t(
              'Changing these settings will affect all charts using this dataset, including charts owned by other people.',
            )}
          </>
        }
      />
      <StyledTableTabs
        fullWidth={false}
        id="table-tabs"
        data-test="edit-dataset-tabs"
        onChange={handleTabSelectHandler}
        defaultActiveKey={activeTabKey}
      >
        <Tabs.TabPane key={0} tab={t('Source')}>
          {renderSourceFieldsetHandler(theme)}
        </Tabs.TabPane>
        <Tabs.TabPane
          tab={
            <CollectionTabTitle
              collection={sortedMetrics}
              title={t('Metrics')}
            />
          }
          key={1}
        >
          {renderMetricCollectionHandler()}
        </Tabs.TabPane>
        <Tabs.TabPane
          tab={
            <CollectionTabTitle
              collection={databaseColumns}
              title={t('Columns')}
            />
          }
          key={2}
        >
          <StyledColumnsTabWrapper>
            <ColumnButtonWrapper>
              <StyledButtonWrapper>
                <Button
                  buttonSize="small"
                  buttonStyle="tertiary"
                  onClick={syncMetadata}
                  className="sync-from-source"
                  disabled={isEditMode}
                >
                  <i className="fa fa-database" />{' '}
                  {t('Sync columns from source')}
                </Button>
              </StyledButtonWrapper>
            </ColumnButtonWrapper>
            <ColumnCollectionTable
              className="columns-table"
              columns={databaseColumns}
              datasource={datasource}
              onColumnsChange={databaseColumns =>
                setColumnsHandler({ databaseColumns })
              }
              onDatasourceChange={onDatasourceChangeHandler}
            />
            {metadataLoading && <Loading />}
          </StyledColumnsTabWrapper>
        </Tabs.TabPane>
        <Tabs.TabPane
          tab={
            <CollectionTabTitle
              collection={calculatedColumns}
              title={t('Calculated columns')}
            />
          }
          key={3}
        >
          <StyledColumnsTabWrapper>
            <ColumnCollectionTable
              columns={calculatedColumns}
              onColumnsChange={calculatedColumns =>
                setColumnsHandler({ calculatedColumns })
              }
              columnLabelTooltips={{
                column_name: t(
                  'This field is used as a unique identifier to attach ' +
                    'the calculated dimension to charts. It is also used ' +
                    'as the alias in the SQL query.',
                ),
              }}
              onDatasourceChange={onDatasourceChangeHandler}
              datasource={datasource}
              editableColumnName
              showExpression
              allowAddItem
              allowEditDataType
              itemGenerator={() => ({
                column_name: t('<new column>'),
                filterable: true,
                groupby: true,
                expression: t('<enter SQL expression here>'),
                __expanded: true,
              })}
            />
          </StyledColumnsTabWrapper>
        </Tabs.TabPane>
        <Tabs.TabPane key={4} tab={t('Settings')}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <FormContainer>{renderSettingsFieldsetHandler()}</FormContainer>
            </Col>
            <Col xs={24} md={12}>
              <FormContainer>{renderAdvancedFieldsetHandler()}</FormContainer>
            </Col>
          </Row>
        </Tabs.TabPane>
      </StyledTableTabs>
    </DatasourceContainer>
  );
};

DatasourceEditor.defaultProps = defaultProps;
DatasourceEditor.propTypes = propTypes;

const DataSourceComponent = withTheme(DatasourceEditor);

export default withToasts(DataSourceComponent);
