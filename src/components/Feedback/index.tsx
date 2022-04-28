import { Amplify } from '@aws-amplify/core';
import { API } from '@aws-amplify/api';
import { useRef, useState } from 'react';
import {
  FeedbackContainer,
  VoteButton,
  VoteButtonsContainer,
  CommentContainer,
  CommentTextArea,
  CommentButtonContainer,
  CommentSubmitButton
} from './styles';
import awsconfig from '../../aws-exports';
import { useEffect } from 'react';
import isUUID from 'validator/lib/isUUID';
import { trackFeedbackSubmission } from '../../utils/track';

Amplify.configure(awsconfig);
if (process.env.API_ENV === 'production') {
  Amplify.configure({
    aws_cloud_logic_custom: [
      {
        name: 'submissions',
        endpoint: 'https://docs-backend.amplify.aws',
        region: 'us-west-2'
      }
    ]
  });
}

enum FeedbackState {
  START = 'START',
  YES = 'YES',
  NO = 'NO',
  END = 'END'
}

type Feedback = {
  vote: boolean;
  page_path: string;
  id?: string;
  comment?: string;
};

export default function Feedback() {
  const [state, setState] = useState<FeedbackState>(FeedbackState.START);
  const [feedbackId, setFeedbackId] = useState(undefined);
  const [feedbackVote, setFeedbackVote] = useState(undefined);
  const feedbackComment = useRef(null);
  const feedbackQuestion = 'Was this page helpful?';
  const reasonForVote = feedbackVote
    ? 'What did we do well?'
    : 'What can we do better?';
  const feedbackAppreciation = 'Thank you for your feedback!';

  useEffect(() => {
    // UUID of feedback if it exists.
    const id = window.localStorage.getItem('feedbackId');
    if (id && isUUID(id)) {
      setFeedbackId(id);
    }
  }, []);

  async function submitVote(vote: boolean, comment?: string) {
    // Path without heading link
    const pagePath = window.location.href.split('#')[0];

    const body: Feedback = {
      page_path: pagePath,
      vote: vote,
      comment: comment ? comment : ''
    };

    const headers = {
      'content-type': 'application/json'
    };

    if (feedbackId) {
      body.id = feedbackId;
    }

    try {
      trackFeedbackSubmission(vote);

      const result = await API.post('submissions', '/submissions', {
        headers,
        body
      });

      if (!feedbackId && result?.data) {
        const data = JSON.parse(result.data);

        if (data.id) {
          window.localStorage.setItem('feedbackId', data.id);
        }
      }
    } catch (err) {
      console.log(err);
    }
  }

  return (
    <FeedbackContainer>
      {state !== FeedbackState.END ? (
        <>
          <p>{feedbackQuestion}</p>
          <VoteButtonsContainer>
            <VoteButton
              onClick={() => {
                setState(FeedbackState.YES);
                setFeedbackVote(true);
                submitVote(true);
              }}
              selected={state === FeedbackState.YES ? true : false}
              disabled={
                [FeedbackState.YES, FeedbackState.NO].includes(state)
                  ? true
                  : false
              }
            >
              <img
                src="/assets/thumbs-up.svg"
                alt="Thumbs up"
                style={state === FeedbackState.NO ? { opacity: 0.6 } : {}}
              />
              Yes
            </VoteButton>
            <VoteButton
              onClick={() => {
                setState(FeedbackState.NO);
                setFeedbackVote(false);
                submitVote(false);
              }}
              selected={state === FeedbackState.NO ? true : false}
              disabled={
                [FeedbackState.YES, FeedbackState.NO].includes(state)
                  ? true
                  : false
              }
            >
              <img
                src="/assets/thumbs-down.svg"
                alt="Thumbs up"
                style={state === FeedbackState.YES ? { opacity: 0.6 } : {}}
              />
              No
            </VoteButton>
          </VoteButtonsContainer>

          <CommentContainer
            hidden={
              [FeedbackState.YES, FeedbackState.NO].includes(state)
                ? false
                : true
            }
          >
            <label htmlFor="feedback-comment">{reasonForVote}</label>
            <CommentTextArea
              rows={2}
              cols={24}
              id="feedback-comment"
              name="feedback-comment"
              placeholder="Optional"
              ref={feedbackComment}
            ></CommentTextArea>
            <CommentButtonContainer>
              <CommentSubmitButton
                onClick={() => {
                  setState(FeedbackState.END);
                  submitVote(feedbackVote, feedbackComment.current.value);
                }}
              >
                Submit
              </CommentSubmitButton>
              <CommentSubmitButton
                onClick={() => {
                  setState(FeedbackState.START);
                }}
              >
                Cancel
              </CommentSubmitButton>
            </CommentButtonContainer>
          </CommentContainer>
        </>
      ) : (
        <p>{feedbackAppreciation}</p>
      )}
    </FeedbackContainer>
  );
}
