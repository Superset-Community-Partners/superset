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

import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
// TODO: refactor this with `import { AsyncSelect } from src/components/Select`
import { Select } from 'src/components/DeprecatedSelect';
import { t, SupersetClient } from '@superset-ui/core';
import { getClientErrorObject } from '../../utils/getClientErrorObject';

const propTypes = {
  dataEndpoint: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  mutator: PropTypes.func.isRequired,
  onAsyncError: PropTypes.func,
  value: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.arrayOf(PropTypes.number),
  ]),
  valueRenderer: PropTypes.func,
  placeholder: PropTypes.string,
  autoSelect: PropTypes.bool,
};

const defaultProps = {
  placeholder: t('Select ...'),
  onAsyncError: () => {},
};

const AsyncSelect = props => {
  const [isLoading, setIsLoading] = useState(false);
  const [options, setOptions] = useState([]);

  useEffect(() => {
    fetchOptions();
  }, []);
  const onChangeHandler = useCallback(option => {
    props.onChange(option);
  }, []);
  const fetchOptions = useMemo(() => {
    setIsLoading(true);
    const { mutator, dataEndpoint } = props;

    return SupersetClient.get({ endpoint: dataEndpoint })
      .then(({ json }) => {
        const options = mutator ? mutator(json) : json;

        setOptions(options);
        setIsLoading(false);

        if (!props.value && props.autoSelect && options.length > 0) {
          onChangeHandler(options[0]);
        }
      })
      .catch(response =>
        getClientErrorObject(response).then(error => {
          props.onAsyncError(error.error || error.statusText || error);
          setIsLoading(false);
        }),
      );
  }, [options]);

  return (
    <Select
      placeholder={props.placeholder}
      options={options}
      value={props.value}
      isLoading={isLoading}
      onChange={onChangeHandler}
      valueRenderer={props.valueRenderer}
      {...props}
    />
  );
};

AsyncSelect.propTypes = propTypes;
AsyncSelect.defaultProps = defaultProps;

export default AsyncSelect;
