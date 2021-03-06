import React from 'react';
import PropTypes from 'prop-types';
import CatalogForm from './CatalogForm';
import CatalogApi from '../../api/catalogApi';
import { Breadcrumb, Spin, notification, Modal } from 'antd';


export class ManageCatalogPage extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      catalog: { name: '', objpermissions: '' },
      catalogPath: `/catalog/${this.props.match.params.name}`,
      collections: {},
      isTouched: false,
      form: {
        name: ''
      },
      errors: {},
      saving: false,
      loading: true
    };
  }

  componentDidMount() {
    const id = this.props.match.params.id;
    const name = this.props.match.params.name;

    this.fetchCatalogData(name, id);
  }

  componentWillReceiveProps(nextProps) {
    const nextId = nextProps.match.params.id;
    if (nextId === this.props.match.params.id) return;

    const name = this.props.match.params.name;
    this.fetchCatalogData(name, nextId);
  }

  fetchCatalogData = (name, id) => {
    CatalogApi.getCatalogInfo(name)
      .then((response) => {
        this.setState({catalog: response.data});

        const collectionPromises = [];
        let fields = response.data.fields;
        fields.forEach((field) => {
          if (field.category === 'form') {
            collectionPromises.push(this.loadCollection(field.type));
          }
        });

        if (id) {
          return CatalogApi.getFormObjectById(name, id);
        }

        return { data: { _class: this.state.catalog.class } };
      })

      .then(({data}) => {
        this.setState({form: data, loading: false});
      })

      .catch(({response}) => {
        const summary = (response && response.data && response.data.summary);

        notification.error({
          message: 'An error has occurred: ' + summary
        });
      });
  };

  loadCollection = (catalogClass) => {
    return CatalogApi.getCatalogExtendWithClass(catalogClass)
      .then(response => {
        const collection = response.data.children;
        const collections = Object.assign({}, this.state.collections, {[catalogClass]: collection});
        this.setState({collections});
      });
  };

  updateCatalogState = (field, value) => {
    let form = this.state.form;
    form[field] = value;
    return this.setState({ form, isTouched: true });
  };

  catalogFormIsValid() {
    let formIsValid = true;
    let errors = {};

    /*
    Put validation logic here
    */

    this.setState({ errors });
    return formIsValid;
  }


  saveForm = (event) => {
    event.preventDefault();

    if (!this.catalogFormIsValid()) {
      return;
    }

    this.setState({ saving: true });

    let promise;
    const name = this.props.match.params.name;
    const id = this.props.match.params.id;

    if (id) {
      promise = CatalogApi.updateObject(name, id, this.state.form);
    } else {
      promise = CatalogApi.saveObject(name, this.state.form);
    }

    promise
      .then(() => {
        notification.success({
          message: 'Saved successfully!'
        });
        this.setState({ saving: false });
        this.props.history.push(this.state.catalogPath);
      })
      .catch(error => {
        notification.error({
          message: 'An error has occurred: ' + error.summary
        });
        this.setState({ saving: false });
      });
  };

  goPath = (path) => {
    if (this.state.isTouched) {
      Modal.confirm({
        title: 'Do you really want to close this object?',
        content: 'All changes will be lost',
        onOk: () => {
          this.props.history.push(path);
        },
        style: {top: '40vh'}
      });
    } else {
      this.props.history.push(path);
    }
  };

  goPathOnClick = (path) => {
    return (event) => {
      event.preventDefault();
      this.goPath(path);
    };
  };

  closeForm = () => {
    this.goPath(this.state.catalogPath);
  };

  render() {
    const container = (
      <div>
        <Breadcrumb style={{margin: '12px 0'}}>
          <Breadcrumb.Item><a onClick={this.goPathOnClick('/')}>Catalogs</a></Breadcrumb.Item>
          <Breadcrumb.Item>
            <a onClick={this.goPathOnClick(`/catalog/${this.props.match.params.name}`)}>{this.state.catalog.name}</a>
          </Breadcrumb.Item>
          <Breadcrumb.Item>{this.state.form.name || 'Object creating'}</Breadcrumb.Item>
        </Breadcrumb>

        <div style={{background: '#fff', padding: 24, minHeight: 280}}>
          {this.state.loading &&
          <div style={{textAlign: 'center', marginTop: '100px'}}>
            <Spin />
          </div>
          }

          {!this.state.loading &&
          <div>
            {!this.props.match.params.id && <h1>{this.state.catalog.name}: creating new object</h1>}

            {this.props.match.params.id &&
            (this.state.catalog.objpermissions.indexOf('U') !== -1) &&
            <h1>Edit object: {this.state.form.name}</h1>}

            {!this.props.match.params.id &&
            (this.state.catalog.objpermissions.indexOf('U') === -1 &&
            this.state.catalog.objpermissions.indexOf('R') !== -1) &&
            <h1>View object: {this.state.form.name}</h1>}

            <CatalogForm
              inputList={this.state.catalog.fields}
              onChange={this.updateCatalogState}
              onSave={this.saveForm}
              onClose={this.closeForm}
              formObject={this.state.form}
              collections={this.state.collections}
              errors={this.state.errors}
              saving={this.state.saving}
              permissions={this.state.catalog.objpermissions || ''}
            />
          </div>
          }
        </div>
      </div>
    );

    return (
      <Spin spinning={this.state.saving} style={{maxHeight: 'initial'}}>{container}</Spin>
    );
  }
}


ManageCatalogPage.propTypes = {
  history: PropTypes.object,
  match: PropTypes.object,
  location: PropTypes.object
};


export default ManageCatalogPage;
