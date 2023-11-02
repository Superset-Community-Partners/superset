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

import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { t } from '@superset-ui/core';
import { Tooltip } from 'src/components/Tooltip';
import withToasts from 'src/components/MessageToasts/withToasts';
import copyTextToClipboard from 'src/utils/copy';

const propTypes = {
  copyNode: PropTypes.node,
  getText: PropTypes.func,
  onCopyEnd: PropTypes.func,
  shouldShowText: PropTypes.bool,
  text: PropTypes.string,
  wrapped: PropTypes.bool,
  tooltipText: PropTypes.string,
  addDangerToast: PropTypes.func.isRequired,
  addSuccessToast: PropTypes.func.isRequired,
  hideTooltip: PropTypes.bool,
};

const defaultProps = {
  copyNode: <span>{t('Copy')}</span>,
  onCopyEnd: () => {},
  shouldShowText: true,
  wrapped: true,
  tooltipText: t('Copy to clipboard'),
  hideTooltip: false,
};

const CopyToClipboard = (props) => {


    

    const onClickHandler = useCallback(() => {
    if (props.getText) {
      props.getText(d => {
        copyToClipboardHandler(Promise.resolve(d));
      });
    } else {
      copyToClipboardHandler(Promise.resolve(props.text));
    }
  }, []);
    const getDecoratedCopyNodeHandler = useCallback(() => {
    return React.cloneElement(props.copyNode, {
      style: { cursor: 'pointer' },
      onClick: onClickHandler,
    });
  }, []);
    const copyToClipboardHandler = useCallback((textToCopy) => {
    copyTextToClipboard(() => textToCopy)
      .then(() => {
        props.addSuccessToast(t('Copied to clipboard!'));
      })
      .catch(() => {
        props.addDangerToast(
          t(
            'Sorry, your browser does not support copying. Use Ctrl / Cmd + C!',
          ),
        );
      })
      .finally(() => {
        props.onCopyEnd();
      });
  }, []);
    const renderTooltipHandler = useCallback((cursor) => {
    return (
      <>
        {!props.hideTooltip ? (
          <Tooltip
            id="copy-to-clipboard-tooltip"
            placement="topRight"
            style={{ cursor }}
            title={props.tooltipText}
            trigger={['hover']}
            arrowPointAtCenter
          >
            {getDecoratedCopyNodeHandler()}
          </Tooltip>
        ) : (
          getDecoratedCopyNodeHandler()
        )}
      </>
    );
  }, []);
    const renderNotWrappedHandler = useCallback(() => {
    return renderTooltipHandler('pointer');
  }, []);
    const renderLinkHandler = useCallback(() => {
    return (
      <span css={{ display: 'inline-flex', alignItems: 'center' }}>
        {props.shouldShowText && props.text && (
          <span className="m-r-5" data-test="short-url">
            {props.text}
          </span>
        )}
        {renderTooltipHandler()}
      </span>
    );
  }, []);

    const { wrapped } = props;
    if (!wrapped) {
      return renderNotWrappedHandler();
    }
    return renderLinkHandler(); 
};




export default withToasts(CopyToClipboard);

CopyToClipboard.propTypes = propTypes;
CopyToClipboard.defaultProps = defaultProps;
