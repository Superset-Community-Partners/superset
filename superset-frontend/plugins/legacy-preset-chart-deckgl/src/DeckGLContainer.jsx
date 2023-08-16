/* eslint-disable react/jsx-sort-default-props */
/* eslint-disable react/sort-prop-types */
/* eslint-disable react/jsx-handler-names */
/* eslint-disable react/forbid-prop-types */
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
import { observer } from "mobx-react";
import { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { isEqual } from 'lodash';
import { StaticMap } from 'react-map-gl';
import DeckGL from 'deck.gl';
import { styled } from '@superset-ui/core';
import Tooltip from './components/Tooltip';
import 'mapbox-gl/dist/mapbox-gl.css';

const TICK = 250; // milliseconds

const propTypes = {
  viewport: PropTypes.object.isRequired,
  layers: PropTypes.array.isRequired,
  setControlValue: PropTypes.func,
  mapStyle: PropTypes.string,
  mapboxApiAccessToken: PropTypes.string.isRequired,
  children: PropTypes.node,
  bottomMargin: PropTypes.number,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  onViewportChange: PropTypes.func
};
const defaultProps = {
  mapStyle: 'light',
  setControlValue: () => {},
  children: null,
  bottomMargin: 0
};

export const DeckGLContainerBase = (props) => {


    const [timer, setTimer] = useState(setInterval(tickHandler, TICK));
    const [tooltip, setTooltip] = useState(null);
    const [viewState, setViewState] = useState(props.viewport);

    const UNSAFE_componentWillReceivePropsHandler = useCallback((nextProps) => {
    if (!isEqual(nextProps.viewport, props.viewport)) {
      setViewState(nextProps.viewport);
    }
  }, []);
    useEffect(() => {
    return () => {
    clearInterval(timer);
  };
}, [timer]);
    const onViewStateChangeHandler = useCallback(({ viewState }) => {
    setViewState(viewState);
    setLastUpdate(Date.now());
  }, [viewState]);
    const tickHandler = useCallback(() => {
    // Rate limiting updating viewport controls as it triggers lotsa renders
    
    if (lastUpdate && Date.now() - lastUpdate > TICK) {
      const setCV = props.setControlValue;
      if (setCV) {
        setCV('viewport', viewState);
      }
      setLastUpdate(null);
    }
  }, [viewState]);
    const layersHandler = useCallback(() => {
    // Support for layer factory
    if (props.layers.some(l => typeof l === 'function')) {
      return props.layers.map(l => (typeof l === 'function' ? l() : l));
    }

    return props.layers;
  }, []);
    const setTooltipHandler = useCallback(tooltip => {
    setTooltip(tooltip);
  }, [tooltip]);

    const { children, bottomMargin, height, width } = props;
    
    const adjustedHeight = height - bottomMargin;

    const layers = layersHandler();

    return (
      <>
        <div style={{ position: 'relative', width, height: adjustedHeight }}>
          <DeckGL
            initWebGLParameters
            controller
            width={width}
            height={adjustedHeight}
            layers={layers}
            viewState={viewState}
            glOptions={{ preserveDrawingBuffer: true }}
            onViewStateChange={onViewStateChangeHandler}
          >
            <StaticMap
              preserveDrawingBuffer
              mapStyle={props.mapStyle}
              mapboxApiAccessToken={props.mapboxApiAccessToken}
            />
          </DeckGL>
          {children}
        </div>
        <Tooltip tooltip={tooltip} />
      </>
    ); 
};

export const DeckGLContainer = observer(DeckGLContainerBase);




DeckGLContainer.propTypes = propTypes;
DeckGLContainer.defaultProps = defaultProps;

export const DeckGLContainerStyledWrapper = styled(DeckGLContainer)`
  .deckgl-tooltip > div {
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;
