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

import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { isEmpty } from 'lodash';
import {
  isFeatureEnabled,
  FeatureFlag,
  SupersetClient,
  t,
} from '@superset-ui/core';
import { Menu } from 'src/components/Menu';
import { URL_PARAMS } from 'src/constants';
import ShareMenuItems from 'src/dashboard/components/menu/ShareMenuItems';
import CssEditor from 'src/dashboard/components/CssEditor';
import RefreshIntervalModal from 'src/dashboard/components/RefreshIntervalModal';
import SaveModal from 'src/dashboard/components/SaveModal';
import HeaderReportDropdown from 'src/features/reports/ReportModal/HeaderReportDropdown';
import injectCustomCss from 'src/dashboard/util/injectCustomCss';
import { SAVE_TYPE_NEWDASHBOARD } from 'src/dashboard/util/constants';
import FilterScopeModal from 'src/dashboard/components/filterscope/FilterScopeModal';
import downloadAsImage from 'src/utils/downloadAsImage';
import getDashboardUrl from 'src/dashboard/util/getDashboardUrl';
import { getActiveFilters } from 'src/dashboard/util/activeDashboardFilters';
import { getUrlParam } from 'src/utils/urlUtils';
import { LOG_ACTIONS_DASHBOARD_DOWNLOAD_AS_IMAGE } from 'src/logger/LogUtils';

const propTypes = {
  addSuccessToast: PropTypes.func.isRequired,
  addDangerToast: PropTypes.func.isRequired,
  dashboardInfo: PropTypes.object.isRequired,
  dashboardId: PropTypes.number,
  dashboardTitle: PropTypes.string,
  dataMask: PropTypes.object.isRequired,
  customCss: PropTypes.string,
  colorNamespace: PropTypes.string,
  colorScheme: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  updateCss: PropTypes.func.isRequired,
  forceRefreshAllCharts: PropTypes.func.isRequired,
  refreshFrequency: PropTypes.number,
  shouldPersistRefreshFrequency: PropTypes.bool.isRequired,
  setRefreshFrequency: PropTypes.func.isRequired,
  startPeriodicRender: PropTypes.func.isRequired,
  editMode: PropTypes.bool.isRequired,
  userCanEdit: PropTypes.bool,
  userCanShare: PropTypes.bool,
  userCanSave: PropTypes.bool,
  userCanCurate: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
  layout: PropTypes.object.isRequired,
  expandedSlices: PropTypes.object,
  onSave: PropTypes.func.isRequired,
  showPropertiesModal: PropTypes.func.isRequired,
  manageEmbedded: PropTypes.func.isRequired,
  logEvent: PropTypes.func,
  refreshLimit: PropTypes.number,
  refreshWarning: PropTypes.string,
  lastModifiedTime: PropTypes.number.isRequired,
};

const defaultProps = {
  colorNamespace: undefined,
  colorScheme: undefined,
  refreshLimit: 0,
  refreshWarning: null,
};

const MENU_KEYS = {
  SAVE_MODAL: 'save-modal',
  SHARE_DASHBOARD: 'share-dashboard',
  REFRESH_DASHBOARD: 'refresh-dashboard',
  AUTOREFRESH_MODAL: 'autorefresh-modal',
  SET_FILTER_MAPPING: 'set-filter-mapping',
  EDIT_PROPERTIES: 'edit-properties',
  EDIT_CSS: 'edit-css',
  DOWNLOAD_AS_IMAGE: 'download-as-image',
  TOGGLE_FULLSCREEN: 'toggle-fullscreen',
  MANAGE_EMBEDDED: 'manage-embedded',
  MANAGE_EMAIL_REPORT: 'manage-email-report',
};

const SCREENSHOT_NODE_SELECTOR = '.dashboard';

const HeaderActionsDropdown = props => {
  const [css, setCss] = useState(props.customCss);
  const [cssTemplates, setCssTemplates] = useState([]);
  const [showReportSubMenu, setShowReportSubMenu] = useState(null);

  const UNSAFE_componentWillMount = useMemo(() => {
    SupersetClient.get({ endpoint: '/csstemplateasyncmodelview/api/read' })
      .then(({ json }) => {
        const cssTemplates = json.result.map(row => ({
          value: row.template_name,
          css: row.css,
          label: row.template_name,
        }));
        setCssTemplates(cssTemplates);
      })
      .catch(() => {
        props.addDangerToast(
          t('An error occurred while fetching available CSS templates'),
        );
      });
  }, [cssTemplates]);
  const UNSAFE_componentWillReceivePropsHandler = useCallback(nextProps => {
    if (props.customCss !== nextProps.customCss) {
      setStateHandler({ css: nextProps.customCss }, () => {
        injectCustomCss(nextProps.customCss);
      });
    }
  }, []);
  const setShowReportSubMenuHandler = useCallback(show => {
    setShowReportSubMenu(show);
  }, []);
  const changeCssHandler = useCallback(
    css => {
      props.onChange();
      props.updateCss(css);
    },
    [css],
  );
  const changeRefreshIntervalHandler = useCallback(
    (refreshInterval, isPersistent) => {
      props.setRefreshFrequency(refreshInterval, isPersistent);
      props.startPeriodicRender(refreshInterval * 1000);
    },
    [],
  );
  const handleMenuClickHandler = useCallback(({ key, domEvent }) => {
    switch (key) {
      case MENU_KEYS.REFRESH_DASHBOARD:
        props.forceRefreshAllCharts();
        props.addSuccessToast(t('Refreshing charts'));
        break;
      case MENU_KEYS.EDIT_PROPERTIES:
        props.showPropertiesModal();
        break;
      case MENU_KEYS.DOWNLOAD_AS_IMAGE: {
        // menu closes with a delay, we need to hide it manually,
        // so that we don't capture it on the screenshot
        const menu = document.querySelector(
          '.ant-dropdown:not(.ant-dropdown-hidden)',
        );
        menu.style.visibility = 'hidden';
        downloadAsImage(
          SCREENSHOT_NODE_SELECTOR,
          props.dashboardTitle,
          true,
        )(domEvent).then(() => {
          menu.style.visibility = 'visible';
        });
        props.logEvent?.(LOG_ACTIONS_DASHBOARD_DOWNLOAD_AS_IMAGE);
        break;
      }
      case MENU_KEYS.TOGGLE_FULLSCREEN: {
        const url = getDashboardUrl({
          pathname: window.location.pathname,
          filters: getActiveFilters(),
          hash: window.location.hash,
          standalone: !getUrlParam(URL_PARAMS.standalone),
        });
        window.location.replace(url);
        break;
      }
      case MENU_KEYS.MANAGE_EMBEDDED: {
        props.manageEmbedded();
        break;
      }
      default:
        break;
    }
  }, []);

  const {
    dashboardTitle,
    dashboardId,
    dashboardInfo,
    refreshFrequency,
    shouldPersistRefreshFrequency,
    editMode,
    customCss,
    colorNamespace,
    colorScheme,
    layout,
    expandedSlices,
    onSave,
    userCanEdit,
    userCanShare,
    userCanSave,
    userCanCurate,
    isLoading,
    refreshLimit,
    refreshWarning,
    lastModifiedTime,
    addSuccessToast,
    addDangerToast,
    setIsDropdownVisible,
    isDropdownVisible,
    ...rest
  } = props;

  const emailTitle = t('Superset dashboard');
  const emailSubject = `${emailTitle} ${dashboardTitle}`;
  const emailBody = t('Check out this dashboard: ');

  const url = getDashboardUrl({
    pathname: window.location.pathname,
    filters: getActiveFilters(),
    hash: window.location.hash,
  });

  const refreshIntervalOptions =
    dashboardInfo.common?.conf?.DASHBOARD_AUTO_REFRESH_INTERVALS;

  return (
    <Menu selectable={false} data-test="header-actions-menu" {...rest}>
      {!editMode && (
        <Menu.Item
          key={MENU_KEYS.REFRESH_DASHBOARD}
          data-test="refresh-dashboard-menu-item"
          disabled={isLoading}
          onClick={handleMenuClickHandler}
        >
          {t('Refresh dashboard')}
        </Menu.Item>
      )}
      {!editMode && (
        <Menu.Item
          key={MENU_KEYS.TOGGLE_FULLSCREEN}
          onClick={handleMenuClickHandler}
        >
          {getUrlParam(URL_PARAMS.standalone)
            ? t('Exit fullscreen')
            : t('Enter fullscreen')}
        </Menu.Item>
      )}
      {editMode && (
        <Menu.Item
          key={MENU_KEYS.EDIT_PROPERTIES}
          onClick={handleMenuClickHandler}
        >
          {t('Edit properties')}
        </Menu.Item>
      )}
      {editMode && (
        <Menu.Item key={MENU_KEYS.EDIT_CSS}>
          <CssEditor
            triggerNode={<span>{t('Edit CSS')}</span>}
            initialCss={css}
            templates={cssTemplates}
            onChange={changeCssHandler}
          />
        </Menu.Item>
      )}
      <Menu.Divider />
      {userCanSave && (
        <Menu.Item key={MENU_KEYS.SAVE_MODAL}>
          <SaveModal
            addSuccessToast={props.addSuccessToast}
            addDangerToast={props.addDangerToast}
            dashboardId={dashboardId}
            dashboardTitle={dashboardTitle}
            dashboardInfo={dashboardInfo}
            saveType={SAVE_TYPE_NEWDASHBOARD}
            layout={layout}
            expandedSlices={expandedSlices}
            refreshFrequency={refreshFrequency}
            shouldPersistRefreshFrequency={shouldPersistRefreshFrequency}
            lastModifiedTime={lastModifiedTime}
            customCss={customCss}
            colorNamespace={colorNamespace}
            colorScheme={colorScheme}
            onSave={onSave}
            triggerNode={
              <span data-test="save-as-menu-item">{t('Save as')}</span>
            }
            canOverwrite={userCanEdit}
          />
        </Menu.Item>
      )}
      {!editMode && (
        <Menu.Item
          key={MENU_KEYS.DOWNLOAD_AS_IMAGE}
          onClick={handleMenuClickHandler}
        >
          {t('Download as image')}
        </Menu.Item>
      )}
      {userCanShare && (
        <Menu.SubMenu
          key={MENU_KEYS.SHARE_DASHBOARD}
          data-test="share-dashboard-menu-item"
          disabled={isLoading}
          title={t('Share')}
        >
          <ShareMenuItems
            url={url}
            copyMenuItemTitle={t('Copy permalink to clipboard')}
            emailMenuItemTitle={t('Share permalink by email')}
            emailSubject={emailSubject}
            emailBody={emailBody}
            addSuccessToast={addSuccessToast}
            addDangerToast={addDangerToast}
            dashboardId={dashboardId}
          />
        </Menu.SubMenu>
      )}
      {!editMode && userCanCurate && (
        <Menu.Item
          key={MENU_KEYS.MANAGE_EMBEDDED}
          onClick={handleMenuClickHandler}
        >
          {t('Embed dashboard')}
        </Menu.Item>
      )}
      <Menu.Divider />
      {!editMode ? (
        showReportSubMenu ? (
          <>
            <Menu.SubMenu title={t('Manage email report')}>
              <HeaderReportDropdown
                dashboardId={dashboardInfo.id}
                setShowReportSubMenu={setShowReportSubMenuHandler}
                showReportSubMenu={showReportSubMenu}
                setIsDropdownVisible={setIsDropdownVisible}
                isDropdownVisible={isDropdownVisible}
                useTextMenu
              />
            </Menu.SubMenu>
            <Menu.Divider />
          </>
        ) : (
          <Menu>
            <HeaderReportDropdown
              dashboardId={dashboardInfo.id}
              setShowReportSubMenu={setShowReportSubMenuHandler}
              setIsDropdownVisible={setIsDropdownVisible}
              isDropdownVisible={isDropdownVisible}
              useTextMenu
            />
          </Menu>
        )
      ) : null}
      {editMode &&
        !(
          isFeatureEnabled(FeatureFlag.DASHBOARD_NATIVE_FILTERS) &&
          isEmpty(dashboardInfo?.metadata?.filter_scopes)
        ) && (
          <Menu.Item key={MENU_KEYS.SET_FILTER_MAPPING}>
            <FilterScopeModal
              className="m-r-5"
              triggerNode={t('Set filter mapping')}
            />
          </Menu.Item>
        )}

      <Menu.Item key={MENU_KEYS.AUTOREFRESH_MODAL}>
        <RefreshIntervalModal
          addSuccessToast={props.addSuccessToast}
          refreshFrequency={refreshFrequency}
          refreshLimit={refreshLimit}
          refreshWarning={refreshWarning}
          onChange={changeRefreshIntervalHandler}
          editMode={editMode}
          refreshIntervalOptions={refreshIntervalOptions}
          triggerNode={<span>{t('Set auto-refresh interval')}</span>}
        />
      </Menu.Item>
    </Menu>
  );
};

HeaderActionsDropdown.discardChanges = () => {
  window.location.reload();
};

HeaderActionsDropdown.propTypes = propTypes;
HeaderActionsDropdown.defaultProps = defaultProps;

export default HeaderActionsDropdown;
