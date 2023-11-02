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
/* eslint-env browser */

import moment from 'moment';
import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
    styled,
    css,
    isFeatureEnabled,
    FeatureFlag,
    t,
    getSharedLabelColor,
    getExtensionsRegistry,
} from '@superset-ui/core';
import { Global } from '@emotion/react';
import {
    LOG_ACTIONS_PERIODIC_RENDER_DASHBOARD,
    LOG_ACTIONS_FORCE_REFRESH_DASHBOARD,
    LOG_ACTIONS_TOGGLE_EDIT_DASHBOARD,
} from 'src/logger/LogUtils';
import Icons from 'src/components/Icons';
import Button from 'src/components/Button';
import { AntdButton } from 'src/components/';
import { findPermission } from 'src/utils/findPermission';
import { Tooltip } from 'src/components/Tooltip';
import { safeStringify } from 'src/utils/safeStringify';
import HeaderActionsDropdown from 'src/dashboard/components/Header/HeaderActionsDropdown';
import PublishedStatus from 'src/dashboard/components/PublishedStatus';
import UndoRedoKeyListeners from 'src/dashboard/components/UndoRedoKeyListeners';
import PropertiesModal from 'src/dashboard/components/PropertiesModal';
import { chartPropShape } from 'src/dashboard/util/propShapes';
import {
    UNDO_LIMIT,
    SAVE_TYPE_OVERWRITE,
    DASHBOARD_POSITION_DATA_LIMIT,
} from 'src/dashboard/util/constants';
import setPeriodicRunner, {
    stopPeriodicRender,
} from 'src/dashboard/util/setPeriodicRunner';
import { PageHeaderWithActions } from 'src/components/PageHeaderWithActions';
import { DashboardEmbedModal } from '../DashboardEmbedControls';
import OverwriteConfirm from '../OverwriteConfirm';

const extensionsRegistry = getExtensionsRegistry();

const propTypes = {
  addSuccessToast: PropTypes.func.isRequired,
  addDangerToast: PropTypes.func.isRequired,
  addWarningToast: PropTypes.func.isRequired,
  user: PropTypes.object, // UserWithPermissionsAndRoles,
  dashboardInfo: PropTypes.object.isRequired,
  dashboardTitle: PropTypes.string,
  dataMask: PropTypes.object.isRequired,
  charts: PropTypes.objectOf(chartPropShape).isRequired,
  layout: PropTypes.object.isRequired,
  expandedSlices: PropTypes.object,
  customCss: PropTypes.string,
  colorNamespace: PropTypes.string,
  colorScheme: PropTypes.string,
  setColorScheme: PropTypes.func.isRequired,
  setUnsavedChanges: PropTypes.func.isRequired,
  isStarred: PropTypes.bool.isRequired,
  isPublished: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
  onSave: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  fetchFaveStar: PropTypes.func.isRequired,
  fetchCharts: PropTypes.func.isRequired,
  saveFaveStar: PropTypes.func.isRequired,
  savePublished: PropTypes.func.isRequired,
  updateDashboardTitle: PropTypes.func.isRequired,
  editMode: PropTypes.bool.isRequired,
  setEditMode: PropTypes.func.isRequired,
  showBuilderPane: PropTypes.func.isRequired,
  updateCss: PropTypes.func.isRequired,
  logEvent: PropTypes.func.isRequired,
  hasUnsavedChanges: PropTypes.bool.isRequired,
  maxUndoHistoryExceeded: PropTypes.bool.isRequired,
  lastModifiedTime: PropTypes.number.isRequired,

  // redux
  onRefresh: PropTypes.func.isRequired,
  onUndo: PropTypes.func.isRequired,
  onRedo: PropTypes.func.isRequired,
  undoLength: PropTypes.number.isRequired,
  redoLength: PropTypes.number.isRequired,
  setMaxUndoHistoryExceeded: PropTypes.func.isRequired,
  maxUndoHistoryToast: PropTypes.func.isRequired,
  refreshFrequency: PropTypes.number,
  shouldPersistRefreshFrequency: PropTypes.bool.isRequired,
  setRefreshFrequency: PropTypes.func.isRequired,
  dashboardInfoChanged: PropTypes.func.isRequired,
  dashboardTitleChanged: PropTypes.func.isRequired,
};

const defaultProps = {
  colorNamespace: undefined,
  colorScheme: undefined,
};

const headerContainerStyle = theme => css`
  border-bottom: 1px solid ${theme.colors.grayscale.light2};
`;

const editButtonStyle = theme => css`
  color: ${theme.colors.primary.dark2};
`;

const actionButtonsStyle = theme => css`
  display: flex;
  align-items: center;

  .action-schedule-report {
    margin-left: ${theme.gridUnit * 2}px;
  }

  .undoRedo {
    display: flex;
    margin-right: ${theme.gridUnit * 2}px;
  }
`;

const StyledUndoRedoButton = styled(AntdButton)`
  padding: 0;
  &:hover {
    background: transparent;
  }
`;

const undoRedoStyle = theme => css`
  color: ${theme.colors.grayscale.light1};
  &:hover {
    color: ${theme.colors.grayscale.base};
  }
`;

const undoRedoEmphasized = theme => css`
  color: ${theme.colors.grayscale.base};
`;

const undoRedoDisabled = theme => css`
  color: ${theme.colors.grayscale.light2};
`;

const saveBtnStyle = theme => css`
  min-width: ${theme.gridUnit * 17}px;
  height: ${theme.gridUnit * 8}px;
`;

const discardBtnStyle = theme => css`
  min-width: ${theme.gridUnit * 22}px;
  height: ${theme.gridUnit * 8}px;
`;

const Header = (props) => {


    const [didNotifyMaxUndoHistoryToast, setDidNotifyMaxUndoHistoryToast] = useState(false);
    const [emphasizeUndo, setEmphasizeUndo] = useState(false);
    const [emphasizeRedo, setEmphasizeRedo] = useState(false);
    const [showingPropertiesModal, setShowingPropertiesModal] = useState(false);
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);
    const [showingEmbedModal, setShowingEmbedModal] = useState();

    useEffect(() => {
    const { refreshFrequency } = props;
    startPeriodicRenderHandler(refreshFrequency * 1000);
  }, []);
    useEffect(() => {
    if (props.refreshFrequency !== prevProps.refreshFrequency) {
      const { refreshFrequency } = props;
      startPeriodicRenderHandler(refreshFrequency * 1000);
    }
  }, []);
    const UNSAFE_componentWillReceivePropsHandler = useCallback((nextProps) => {
    if (
      UNDO_LIMIT - nextProps.undoLength <= 0 &&
      !didNotifyMaxUndoHistoryToast
    ) {
      setStateHandler(() => ({ didNotifyMaxUndoHistoryToast: true }));
      props.maxUndoHistoryToast();
    }
    if (
      nextProps.undoLength > UNDO_LIMIT &&
      !props.maxUndoHistoryExceeded
    ) {
      props.setMaxUndoHistoryExceeded();
    }
  }, [didNotifyMaxUndoHistoryToast]);
    useEffect(() => {
    return () => {
    stopPeriodicRender(refreshTimerHandler);
    props.setRefreshFrequency(0);
    clearTimeout(ctrlYTimeoutHandler);
    clearTimeout(ctrlZTimeoutHandler);
  };
}, []);
    const handleChangeTextHandler = useCallback((nextText) => {
    const { updateDashboardTitle, onChange } = props;
    if (nextText && props.dashboardTitle !== nextText) {
      updateDashboardTitle(nextText);
      onChange();
    }
  }, []);
    const setIsDropdownVisibleHandler = useCallback((visible) => {
    setIsDropdownVisible(visible);
  }, []);
    const handleCtrlYHandler = useCallback(() => {
    props.onRedo();
    setStateHandler({ emphasizeRedo: true }, () => {
      if (ctrlYTimeoutHandler) clearTimeout(ctrlYTimeoutHandler);
      ctrlYTimeoutHandler = setTimeout(() => {
        setEmphasizeRedo(false);
      }, 100);
    });
  }, []);
    const handleCtrlZHandler = useCallback(() => {
    props.onUndo();
    setStateHandler({ emphasizeUndo: true }, () => {
      if (ctrlZTimeoutHandler) clearTimeout(ctrlZTimeoutHandler);
      ctrlZTimeoutHandler = setTimeout(() => {
        setEmphasizeUndo(false);
      }, 100);
    });
  }, []);
    const forceRefreshHandler = useCallback(() => {
    if (!props.isLoading) {
      const chartList = Object.keys(props.charts);
      props.logEvent(LOG_ACTIONS_FORCE_REFRESH_DASHBOARD, {
        force: true,
        interval: 0,
        chartCount: chartList.length,
      });
      return props.onRefresh(
        chartList,
        true,
        0,
        props.dashboardInfo.id,
      );
    }
    return false;
  }, []);
    const startPeriodicRenderHandler = useCallback((interval) => {
    let intervalMessage;

    if (interval) {
      const { dashboardInfo } = props;
      const periodicRefreshOptions =
        dashboardInfo.common?.conf?.DASHBOARD_AUTO_REFRESH_INTERVALS;
      const predefinedValue = periodicRefreshOptions.find(
        option => Number(option[0]) === interval / 1000,
      );

      if (predefinedValue) {
        intervalMessage = t(predefinedValue[1]);
      } else {
        intervalMessage = moment.duration(interval, 'millisecond').humanize();
      }
    }

    const periodicRender = () => {
      const { fetchCharts, logEvent, charts, dashboardInfo } = props;
      const { metadata } = dashboardInfo;
      const immune = metadata.timed_refresh_immune_slices || [];
      const affectedCharts = Object.values(charts)
        .filter(chart => immune.indexOf(chart.id) === -1)
        .map(chart => chart.id);

      logEvent(LOG_ACTIONS_PERIODIC_RENDER_DASHBOARD, {
        interval,
        chartCount: affectedCharts.length,
      });
      props.addWarningToast(
        t(
          `This dashboard is currently auto refreshing; the next auto refresh will be in %s.`,
          intervalMessage,
        ),
      );
      if (dashboardInfo.common.conf.DASHBOARD_AUTO_REFRESH_MODE === 'fetch') {
        // force-refresh while auto-refresh in dashboard
        return fetchCharts(
          affectedCharts,
          false,
          interval * 0.2,
          dashboardInfo.id,
        );
      }
      return fetchCharts(
        affectedCharts,
        true,
        interval * 0.2,
        dashboardInfo.id,
      );
    };

    refreshTimerHandler = setPeriodicRunner({
      interval,
      periodicRender,
      refreshTimer: refreshTimerHandler,
    });
  }, []);
    const toggleEditModeHandler = useCallback(() => {
    props.logEvent(LOG_ACTIONS_TOGGLE_EDIT_DASHBOARD, {
      edit_mode: !props.editMode,
    });
    props.setEditMode(!props.editMode);
  }, []);
    const overwriteDashboardHandler = useCallback(() => {
    const {
      dashboardTitle,
      layout: positions,
      colorScheme,
      colorNamespace,
      customCss,
      dashboardInfo,
      refreshFrequency: currentRefreshFrequency,
      shouldPersistRefreshFrequency,
      lastModifiedTime,
      slug,
    } = props;

    // check refresh frequency is for current session or persist
    const refreshFrequency = shouldPersistRefreshFrequency
      ? currentRefreshFrequency
      : dashboardInfo.metadata?.refresh_frequency;

    const currentColorScheme =
      dashboardInfo?.metadata?.color_scheme || colorScheme;
    const currentColorNamespace =
      dashboardInfo?.metadata?.color_namespace || colorNamespace;
    const currentSharedLabelColors = Object.fromEntries(
      getSharedLabelColor().getColorMap(),
    );

    const data = {
      certified_by: dashboardInfo.certified_by,
      certification_details: dashboardInfo.certification_details,
      css: customCss,
      dashboard_title: dashboardTitle,
      last_modified_time: lastModifiedTime,
      owners: dashboardInfo.owners,
      roles: dashboardInfo.roles,
      slug,
      metadata: {
        ...dashboardInfo?.metadata,
        color_namespace: currentColorNamespace,
        color_scheme: currentColorScheme,
        positions,
        refresh_frequency: refreshFrequency,
        shared_label_colors: currentSharedLabelColors,
      },
    };

    // make sure positions data less than DB storage limitation:
    const positionJSONLength = safeStringify(positions).length;
    const limit =
      dashboardInfo.common.conf.SUPERSET_DASHBOARD_POSITION_DATA_LIMIT ||
      DASHBOARD_POSITION_DATA_LIMIT;
    if (positionJSONLength >= limit) {
      props.addDangerToast(
        t(
          'Your dashboard is too large. Please reduce its size before saving it.',
        ),
      );
    } else {
      if (positionJSONLength >= limit * 0.9) {
        props.addWarningToast('Your dashboard is near the size limit.');
      }

      props.onSave(data, dashboardInfo.id, SAVE_TYPE_OVERWRITE);
    }
  }, []);
    const showPropertiesModalHandler = useCallback(() => {
    setShowingPropertiesModal(true);
  }, []);
    const hidePropertiesModalHandler = useCallback(() => {
    setShowingPropertiesModal(false);
  }, []);
    const showEmbedModalHandler = useCallback(() => {
    setShowingEmbedModal(true);
  }, []);
    const hideEmbedModalHandler = useCallback(() => {
    setShowingEmbedModal(false);
  }, []);

    const {
      dashboardTitle,
      layout,
      expandedSlices,
      customCss,
      colorNamespace,
      dataMask,
      setColorScheme,
      setUnsavedChanges,
      colorScheme,
      onUndo,
      onRedo,
      undoLength,
      redoLength,
      onChange,
      onSave,
      updateCss,
      editMode,
      isPublished,
      user,
      dashboardInfo,
      hasUnsavedChanges,
      isLoading,
      refreshFrequency,
      shouldPersistRefreshFrequency,
      setRefreshFrequency,
      lastModifiedTime,
      logEvent,
    } = props;

    const userCanEdit =
      dashboardInfo.dash_edit_perm && !dashboardInfo.is_managed_externally;
    const userCanShare = dashboardInfo.dash_share_perm;
    const userCanSaveAs = dashboardInfo.dash_save_perm;
    const userCanCurate =
      isFeatureEnabled(FeatureFlag.EMBEDDED_SUPERSET) &&
      findPermission('can_set_embedded', 'Dashboard', user.roles);
    const refreshLimit =
      dashboardInfo.common?.conf?.SUPERSET_DASHBOARD_PERIODICAL_REFRESH_LIMIT;
    const refreshWarning =
      dashboardInfo.common?.conf
        ?.SUPERSET_DASHBOARD_PERIODICAL_REFRESH_WARNING_MESSAGE;

    const handleOnPropertiesChange = updates => {
      const { dashboardInfoChanged, dashboardTitleChanged } = props;

      setColorScheme(updates.colorScheme);
      dashboardInfoChanged({
        slug: updates.slug,
        metadata: JSON.parse(updates.jsonMetadata || '{}'),
        certified_by: updates.certifiedBy,
        certification_details: updates.certificationDetails,
        owners: updates.owners,
        roles: updates.roles,
      });
      setUnsavedChanges(true);
      dashboardTitleChanged(updates.title);
    };

    const NavExtension = extensionsRegistry.get('dashboard.nav.right');

    return (
      <div
        css={headerContainerStyle}
        data-test="dashboard-header-container"
        data-test-id={dashboardInfo.id}
        className="dashboard-header-container"
      >
        <PageHeaderWithActions
          editableTitleProps={{
            title: dashboardTitle,
            canEdit: userCanEdit && editMode,
            onSave: handleChangeTextHandler,
            placeholder: t('Add the name of the dashboard'),
            label: t('Dashboard title'),
            showTooltip: false,
          }}
          certificatiedBadgeProps={{
            certifiedBy: dashboardInfo.certified_by,
            details: dashboardInfo.certification_details,
          }}
          faveStarProps={{
            itemId: dashboardInfo.id,
            fetchFaveStar: props.fetchFaveStar,
            saveFaveStar: props.saveFaveStar,
            isStarred: props.isStarred,
            showTooltip: true,
          }}
          titlePanelAdditionalItems={[
            !editMode && (
              <PublishedStatus
                dashboardId={dashboardInfo.id}
                isPublished={isPublished}
                savePublished={props.savePublished}
                canEdit={userCanEdit}
                canSave={userCanSaveAs}
                visible={!editMode}
              />
            ),
          ]}
          rightPanelAdditionalItems={
            <div className="button-container">
              {userCanSaveAs && (
                <div
                  className="button-container"
                  data-test="dashboard-edit-actions"
                >
                  {editMode && (
                    <div css={actionButtonsStyle}>
                      <div className="undoRedo">
                        <Tooltip
                          id="dashboard-undo-tooltip"
                          title={t('Undo the action')}
                        >
                          <StyledUndoRedoButton
                            type="text"
                            disabled={undoLength < 1}
                          >
                            <Icons.Undo
                              css={[
                                undoRedoStyle,
                                emphasizeUndo && undoRedoEmphasized,
                                undoLength < 1 && undoRedoDisabled,
                              ]}
                              onClick={undoLength && onUndo}
                              data-test="undo-action"
                              iconSize="xl"
                            />
                          </StyledUndoRedoButton>
                        </Tooltip>
                        <Tooltip
                          id="dashboard-redo-tooltip"
                          title={t('Redo the action')}
                        >
                          <StyledUndoRedoButton
                            type="text"
                            disabled={redoLength < 1}
                          >
                            <Icons.Redo
                              css={[
                                undoRedoStyle,
                                emphasizeRedo && undoRedoEmphasized,
                                redoLength < 1 && undoRedoDisabled,
                              ]}
                              onClick={redoLength && onRedo}
                              data-test="redo-action"
                              iconSize="xl"
                            />
                          </StyledUndoRedoButton>
                        </Tooltip>
                      </div>
                      <Button
                        css={discardBtnStyle}
                        buttonSize="small"
                        onClick={constructorHandler.discardChanges}
                        buttonStyle="default"
                        data-test="discard-changes-button"
                        aria-label={t('Discard')}
                      >
                        {t('Discard')}
                      </Button>
                      <Button
                        css={saveBtnStyle}
                        buttonSize="small"
                        disabled={!hasUnsavedChanges}
                        buttonStyle="primary"
                        onClick={overwriteDashboardHandler}
                        data-test="header-save-button"
                        aria-label={t('Save')}
                      >
                        {t('Save')}
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {editMode ? (
                <UndoRedoKeyListeners
                  onUndo={handleCtrlZHandler}
                  onRedo={handleCtrlYHandler}
                />
              ) : (
                <div css={actionButtonsStyle}>
                  {NavExtension && <NavExtension />}
                  {userCanEdit && (
                    <Button
                      buttonStyle="secondary"
                      onClick={toggleEditModeHandler}
                      data-test="edit-dashboard-button"
                      className="action-button"
                      css={editButtonStyle}
                      aria-label={t('Edit dashboard')}
                    >
                      {t('Edit dashboard')}
                    </Button>
                  )}
                </div>
              )}
            </div>
          }
          menuDropdownProps={{
            getPopupContainer: triggerNode =>
              triggerNode.closest('.header-with-actions'),
            visible: isDropdownVisible,
            onVisibleChange: setIsDropdownVisibleHandler,
          }}
          additionalActionsMenu={
            <HeaderActionsDropdown
              addSuccessToast={props.addSuccessToast}
              addDangerToast={props.addDangerToast}
              dashboardId={dashboardInfo.id}
              dashboardTitle={dashboardTitle}
              dashboardInfo={dashboardInfo}
              dataMask={dataMask}
              layout={layout}
              expandedSlices={expandedSlices}
              customCss={customCss}
              colorNamespace={colorNamespace}
              colorScheme={colorScheme}
              onSave={onSave}
              onChange={onChange}
              forceRefreshAllCharts={forceRefreshHandler}
              startPeriodicRender={startPeriodicRenderHandler}
              refreshFrequency={refreshFrequency}
              shouldPersistRefreshFrequency={shouldPersistRefreshFrequency}
              setRefreshFrequency={setRefreshFrequency}
              updateCss={updateCss}
              editMode={editMode}
              hasUnsavedChanges={hasUnsavedChanges}
              userCanEdit={userCanEdit}
              userCanShare={userCanShare}
              userCanSave={userCanSaveAs}
              userCanCurate={userCanCurate}
              isLoading={isLoading}
              showPropertiesModal={showPropertiesModalHandler}
              manageEmbedded={showEmbedModalHandler}
              refreshLimit={refreshLimit}
              refreshWarning={refreshWarning}
              lastModifiedTime={lastModifiedTime}
              isDropdownVisible={isDropdownVisible}
              setIsDropdownVisible={setIsDropdownVisibleHandler}
              logEvent={logEvent}
            />
          }
          showFaveStar={user?.userId && dashboardInfo?.id}
          showTitlePanelItems
        />
        {showingPropertiesModal && (
          <PropertiesModal
            dashboardId={dashboardInfo.id}
            dashboardInfo={dashboardInfo}
            dashboardTitle={dashboardTitle}
            show={showingPropertiesModal}
            onHide={hidePropertiesModalHandler}
            colorScheme={props.colorScheme}
            onSubmit={handleOnPropertiesChange}
            onlyApply
          />
        )}

        <OverwriteConfirm />

        {userCanCurate && (
          <DashboardEmbedModal
            show={showingEmbedModal}
            onHide={hideEmbedModalHandler}
            dashboardId={dashboardInfo.id}
          />
        )}
        <Global
          styles={css`
            .ant-menu-vertical {
              border-right: none;
            }
          `}
        />
      </div>
    ); 
};

Header.discardChanges = () => {
    const url = new URL(window.location.href);

    url.searchParams.delete('edit');
    window.location.assign(url);
  };


Header.propTypes = propTypes;
Header.defaultProps = defaultProps;

export default Header;
