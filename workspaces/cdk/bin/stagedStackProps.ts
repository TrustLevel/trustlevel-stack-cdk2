import {StackProps} from 'aws-cdk-lib';
import {Stage} from './stages';

export interface StagedStackProps extends StackProps {
  stage: Stage;
}
