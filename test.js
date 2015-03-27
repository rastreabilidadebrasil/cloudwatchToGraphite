var Q = require('q');
var AWS = require('aws-sdk');
var awsPromiseWrapper = require('./awsPromise')
var _ = require('lodash');
var ec2 = new AWS.EC2({
  region: 'sa-east-1'
});
var cloudWatch = new AWS.CloudWatch({
  region: 'sa-east-1'
});
var params = {
  Filters: [{
    Name: 'tag-key',
    Values: ['Name']
  }]
};
var elements = {};
var minutesBefore = 5;

var dataProcessor = function(metric, server) {
  return function(data) {
    data.Datapoints.forEach(function(point) {

      var uri = [metric.Namespace, server.Type || 'no_type', server.Name,
        _.result(_.find(metric.Dimensions, {
          'Name': 'MountPath'
        }), 'Value'), _.result(_.find(metric.Dimensions, {
          'Name': 'QueueName'
        }), 'Value'), metric.MetricName, point.Unit + '_STATSTYPE'
      ]
      var uriStr = _.chain(uri).compact().map(function(element) {
        return element.replace('/', '_').replace(' ', '_').toLowerCase();
      }).value().join('.');
      if (server.Type === 'mongo') {
        console.log([uriStr.replace('_statstype', '_average'), point.Average,
          point.Timestamp.getTime() / 1000
        ].join(' '));
        console.log([uriStr.replace('_statstype', '_sum'), point.Sum,
          point.Timestamp.getTime() / 1000
        ].join(' '));
      }

    });
  }

}



var SQSparams = {
  Dimensions: [{
    Name: 'Namespace',
    /* required */
    Value: 'AWS/SQS'
  }]
};
awsPromiseWrapper.listMetrics(SQSparams).then(function(data) {
  data.Metrics.forEach(function(metric) {
    var EndTime = new Date
    var cwParams = {
      EndTime: EndTime,
      MetricName: metric.MetricName,
      Namespace: metric.Namespace,
      Period: 60,
      StartTime: new Date(EndTime.getTime() - minutesBefore * 60 *
        1000),
      Statistics: [
        'Average',
        'Sum'
      ],
      Dimensions: metric.Dimensions
    };
    awsPromiseWrapper.getMetricStatistics(cwParams).done(dataProcessor(
      metric, {
        Name: 'SQS'
      }));
  });
}).catch(function(error) {
  console.log(error);
});


Q.all([awsPromiseWrapper.describeInstances(params), awsPromiseWrapper.describeVolumes(
  params)]).then(function(data) {

  elements.instances = [];
  elements.volumes = [];
  _.map(data[0].Reservations, function(reservation) {
    _.map(reservation.Instances, function(instance) {
      //console.log(instance.BlockDeviceMappings);
      var server = {
        id: instance.InstanceId
      };

      server.volumes = instance.BlockDeviceMappings;

      server.volumes.forEach(function(volume) {

        var details = _.findLast(data[1].Volumes, function(
          vol) {

          return vol.VolumeId === volume.Ebs.VolumeId
        })

        if (details) {
          _.map(details.Tags, function(tag) {
            volume[tag.Key] = tag.Value;
          });
        }
        _.map(instance.Tags, function(tag) {
          if (tag.Key === 'Type') {
            volume.Type = tag.Value
          }
        })


      });


      elements.instances.push(server);



    });
  });

  var processMetrics = function(data, server) {

    data.Metrics.forEach(function(metric) {
      var EndTime = new Date
      var cwParams = {
        EndTime: EndTime,
        MetricName: metric.MetricName,
        Namespace: metric.Namespace,
        Period: 60,
        StartTime: new Date(EndTime.getTime() -
          minutesBefore * 60 * 1000),
        Statistics: [
          'Average',
          'Sum'
        ],
        Dimensions: metric.Dimensions
      };
      awsPromiseWrapper.getMetricStatistics(cwParams).done(
        dataProcessor(metric, server));

    });
  }

  elements.instances.forEach(function(server) {
    awsPromiseWrapper.listMetrics({
      Dimensions: [{
        Name: 'InstanceId',
        Value: server.id
      }]
    }).done(function(data) {
      processMetrics(data, server);
    });
    server.volumes.forEach(function(volume) {
      awsPromiseWrapper.listMetrics({
        Dimensions: [{
          Name: 'VolumeId',
          Value: volume.id
        }]
      }).done(function(data) {

        processMetrics(data, volume);
      });
    })

  });


}).catch(function(error) {
  console.log(error);
});
